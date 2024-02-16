const db = require('../db.js');
const nodemailer = require('nodemailer');
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


const createTable = async () => {
  console.log("runnnnn")
    const client = db.getClient();

  try {
    await client.connect();
    await client.query('SET enable_experimental_alter_column_type_general = true;');
    const query =`
    ALTER TABLE public.emails
    ADD COLUMN date TIMESTAMP,
    ADD COLUMN importance INT8
    `;

    await client.query(query);
    console.log('Table "email" updated');
  } catch (error) {
    console.error('Error creating table:', error);
  } finally {
    await client.end();
    
  }
};
const createServicesTable = async () => {
  const client = db.getClient();

  try {
    await client.connect();

    const query = `
    ALTER TABLE user_service
    ALTER COLUMN user_id TYPE INT8 USING user_id::INT8;
    `;

    await client.query(query);
    console.log('Table "services" created successfully');
  } catch (error) {
    console.error('Error creating "services" table:', error);
  } finally {
    await client.end();
  }
};

const Send = async (req, res) => {
  const { email, text, subject, userId } = req.body;
  console.log("email from send",userId, email, text, subject);
  console.log(req.body);

  const client = db.getClient();

  try {
    await client.connect();
    
    // Check if userId is provided and has at least one service
    let importance = 0;
    if (userId) {
      const serviceQuery = `
        SELECT COUNT(*) AS serviceCount
        FROM user_service
        WHERE user_id = $1;
      `;
      const serviceValues = [userId];
      const serviceResult = await client.query(serviceQuery, serviceValues);
      importance = serviceResult.rows[0].servicecount > 0 ? 1 : 0;
    }

    // Insert email details into emails table
    const insertQuery = `
      INSERT INTO emails (email, text, subject,date, importance)
      VALUES ($1, $2, $3,NOW(), $4) RETURNING id;
    `;
    const insertValues = [email, text, subject, importance];
    const result = await client.query(insertQuery, insertValues);
    console.log(importance)
    console.log(`Email inserted with ID: ${result.rows[0].id}`);
    res.status(200).json({ msg: "OK" });
  } catch (error) {
    console.error('Error inserting email details:', error);
    res.status(500).json({ error: "Internal Server Error" });
  } finally {
    await client.end();
  }
};


  const getMail = async (req, res) => {
    let client;
    try {
      // Create a new connection to the database for each request
      client = new Client({
        connectionString: "postgresql://abdallah:lmv1Px24z_r8Mu4Sa7L6sA@crab-forager-8531.7tc.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full",
        ssl: {
          rejectUnauthorized: false,
        },
      });
  
      await client.connect();
  
      // Retrieve all emails from the "emails" table
      const selectQuery = 'SELECT * FROM emails';
      const result = await client.query(selectQuery);
  
      const emailData = result.rows.map(row => ({
        id :row.id,
        email: row.email,
        subject: row.subject,
        text: row.text,
        importance : row.importance,
        date:row.date
      }));
  
      res.status(200).json({ emailData });
    } catch (error) {
      console.error('Error retrieving emails:', error);
      res.status(500).json({ error: "Internal Server Error" });
    } finally {
      if (client) {
        try {
          await client.end();
        } catch (endError) {
          console.error('Error closing the database connection:', endError);
        }
      }
    }
  };
  const deleteMail = async (req, res) => {
    const { id } = req.body;
  
    // Validate the request body
    if (!id) {
        return res.status(400).json({ error: 'Invalid request body' });
    }
  
    const client = db.getClient();
  
    try {
        await client.connect();
  

        const checkEmailQuery = 'SELECT * FROM emails WHERE id = $1;';
        const checkEmailValues = [id];
        const checkEmailResult = await client.query(checkEmailQuery, checkEmailValues);
  
        if (checkEmailResult.rows.length === 0) {
            return res.status(404).json({ error: 'email not found' });
        }
  
      
        const deleteQuery = 'DELETE FROM emails WHERE id = $1 RETURNING id;';
        const deleteValues = [id];
        const deleteResult = await client.query(deleteQuery, deleteValues);
  
        console.log(`email deleted with ID: ${deleteResult.rows[0].id}`);
  
        return res.status(200).json({
            msg: 'email deleted successfully',
            id: deleteResult.rows[0].id,
        });
    } catch (error) {
        console.error('Error deleting email:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await client.end();
    }
  };

  
  const addService = async (req, res) => {
    const { nom_du_service, description } = req.body;
  
    // Validate the request body
    if (!nom_du_service || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    const client = new Client({
      connectionString: "postgresql://abdallah:lmv1Px24z_r8Mu4Sa7L6sA@crab-forager-8531.7tc.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full",
      ssl: {
        rejectUnauthorized: false,
      },
    });
  
    try {
      await client.connect();
  
      // Insert the new service into the "services" table
      const insertQuery = `
        INSERT INTO services (nom_du_service, description) VALUES ($1, $2) RETURNING id;
      `;
      const values = [nom_du_service, description];
      const result = await client.query(insertQuery, values);
  
      console.log(`Service inserted with ID: ${result.rows[0].id}`);
  
      return res.status(201).json({
        msg: 'Service added successfully',
        serviceId: result.rows[0].id,
      });
    } catch (error) {
      console.error('Error adding service:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      await client.end();
    }
  };
  const getService = async (req, res) => {
    const client = db.getClient();
  
    try {
      await client.connect();
  
      const selectQuery = 'SELECT nom_du_service, description FROM services';
      const result = await client.query(selectQuery);
  
      const serviceData = result.rows.map(row => ({
        nom_du_service: row.nom_du_service,
        description: row.description,
      }));
  
      res.status(200).json({ serviceData });
    } catch (error) {
      console.error('Error retrieving services:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      await client.end();
    }
  };
  const addBlog = async (req, res) => {
    const { image, title, content } = req.body;
  
    // Validate the request body
    if (!image || !title || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
  
    const client = db.getClient();
  
    try {
      await client.connect();
  
      // Insert the new blog into the "blogs" table
      const insertQuery = `
        INSERT INTO blogs (image_data, title, content) VALUES ($1, $2, $3) RETURNING id;
      `;
      const values = [image, title, content];
      const result = await client.query(insertQuery, values);
  
      console.log(`Blog added with ID: ${result.rows[0].id}`);
  
      return res.status(201).json({
        msg: 'Blog added successfully',
        blogId: result.rows[0].id,
      });
    } catch (error) {
      console.error('Error adding blog:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      await client.end();
    }
  };
  const getBlogs = async (req, res) => {
    const client = db.getClient();
  
    try {
      await client.connect();
  
      const selectQuery = 'SELECT * FROM blogs';
      const result = await client.query(selectQuery);
  
      const blogPosts = result.rows.map(row => ({
        id : row.id,
        name: row.title,
        image: row.image_data,
        content: row.content,
      }));
  
      res.status(200).json({ blogPosts });
    } catch (error) {
      console.error('Error retrieving blog posts:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      // Use end() instead of release() if getClient() doesn't return a client with release()
      await client.end();
    }
  };
  const modifyBlog = async (req, res) => {
    const { id, image, name, content } = req.body;
   
    console.log("hmmmm",id,name,content)
    const blogId = id
    // Validate the request body
    if (!blogId || (!image && !name && content === undefined)) {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    const client = db.getClient();

    try {
        await client.connect();

        // Check if the blog with the given ID exists
        const checkBlogQuery = `
            SELECT * FROM blogs WHERE id = $1;
        `;
        const checkBlogValues = [blogId];
        const checkBlogResult = await client.query(checkBlogQuery, checkBlogValues);

        if (checkBlogResult.rows.length === 0) {
            return res.status(404).json({ error: 'Blog not found' });
        }

        // Update the existing blog in the "blogs" table
        const updateQuery = `
            UPDATE blogs SET 
                image_data = COALESCE($2, image_data),
                title = COALESCE($3, title),
                content = COALESCE($4, content)
            WHERE id = $1
            RETURNING id;
        `;

        const updateValues = [blogId, image, name, content];
        const updateResult = await client.query(updateQuery, updateValues);

        console.log(`Blog modified with ID: ${updateResult.rows[0].id}`);

        return res.status(200).json({
            msg: 'Blog modified successfully',
            blogId: updateResult.rows[0].id,
        });
    } catch (error) {
        console.error('Error modifying blog:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await client.end();
    }
};
const deleteBlog = async (req, res) => {
  const { id } = req.body;
  blogId=id;
  console.log(id);
  // Validate the request body
  if (!blogId) {
      return res.status(400).json({ error: 'Invalid request body' });
  }

  const client = db.getClient();

  try {
      await client.connect();

      // Check if the blog with the given ID exists
      const checkBlogQuery = 'SELECT * FROM blogs WHERE id = $1;';
      const checkBlogValues = [blogId];
      const checkBlogResult = await client.query(checkBlogQuery, checkBlogValues);

      if (checkBlogResult.rows.length === 0) {
          return res.status(404).json({ error: 'Blog not found' });
      }

      // Delete the blog from the "blogs" table
      const deleteQuery = 'DELETE FROM blogs WHERE id = $1 RETURNING id;';
      const deleteValues = [blogId];
      const deleteResult = await client.query(deleteQuery, deleteValues);

      console.log(`Blog deleted with ID: ${deleteResult.rows[0].id}`);

      return res.status(200).json({
          msg: 'Blog deleted successfully',
          blogId: deleteResult.rows[0].id,
      });
  } catch (error) {
      console.error('Error deleting blog:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
      await client.end();
  }
};
  const addTechno = async (req,res) => {
    const client = db.getClient();
    const {title, image, description}=req.body
    try {
      await client.connect();
  
      const insertQuery = `
        INSERT INTO technologies (title, image, description) VALUES ($1, $2, $3) RETURNING id;
      `;
      const values = [title, image, description];
      const result = await client.query(insertQuery, values);
  
      console.log(`Technology added with ID: ${result.rows[0].id}`);
  
      res.status(201).json({
        msg: 'Technology added successfully',
        technologyId: result.rows[0].id,
      });
    } catch (error) {
      console.error('Error adding technology:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      await client.end();
    }
  };
  const getAllTechnos = async (req, res) => {
    const client = db.getClient();
  
    try {
      await client.connect();
  
      const query = `
        SELECT * FROM technologies;
      `;
      const result = await client.query(query);
  
      const technologies = result.rows;
  
      res.status(200).json(technologies);
    } catch (error) {
      console.error('Error getting technologies:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      await client.end();
    }
  };
  const modifyTechno = async (req, res) => {
    const { technoId, image,title, description } = req.body;
    console.log(technoId,image,title, description)
    // Validate the request body
    if (!technoId || (!title && !description && !image)) {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    const client = db.getClient();

    try {
        await client.connect();

        // Check if the technology with the given ID exists
        const checkTechnoQuery = 'SELECT * FROM technologies WHERE id = $1;';
        const checkTechnoValues = [technoId];
        const checkTechnoResult = await client.query(checkTechnoQuery, checkTechnoValues);

        if (checkTechnoResult.rows.length === 0) {
            return res.status(404).json({ error: 'Technology not found' });
        }

        // Update the existing technology in the "technologies" table
        const updateQuery = `
            UPDATE technologies SET 
                title = COALESCE($2, title),
                description = COALESCE($3, description),
                image = COALESCE($4, image)
            WHERE id = $1
            RETURNING id;
        `;

        const updateValues = [technoId, title, description,image];
        const updateResult = await client.query(updateQuery, updateValues);

        console.log(`Technology modified with ID: ${updateResult.rows[0].id}`);

        return res.status(200).json({
            msg: 'Technology modified successfully',
            technoId: updateResult.rows[0].id,
        });
    } catch (error) {
        console.error('Error modifying technology:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await client.end();
    }
};
const deleteTechno = async (req, res) => {
  const { technoId } = req.body;

  // Validate the request body
  if (!technoId) {
      return res.status(400).json({ error: 'Invalid request body' });
  }

  const client = db.getClient();

  try {
      await client.connect();

      // Check if the technology with the given ID exists
      const checkTechnoQuery = 'SELECT * FROM technologies WHERE id = $1;';
      const checkTechnoValues = [technoId];
      const checkTechnoResult = await client.query(checkTechnoQuery, checkTechnoValues);

      if (checkTechnoResult.rows.length === 0) {
          return res.status(404).json({ error: 'Technology not found' });
      }

      // Delete the technology from the "technologies" table
      const deleteQuery = 'DELETE FROM technologies WHERE id = $1 RETURNING id;';
      const deleteValues = [technoId];
      const deleteResult = await client.query(deleteQuery, deleteValues);

      console.log(`Technology deleted with ID: ${deleteResult.rows[0].id}`);

      return res.status(200).json({
          msg: 'Technology deleted successfully',
          technoId: deleteResult.rows[0].id,
      });
  } catch (error) {
      console.error('Error deleting technology:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
  } finally {
      await client.end();
  }
};
    const addQ = async (req,res) => {
    const client = db.getClient();
    const {question, answer}=req.body
    try {
      await client.connect();
  
      const insertQuery = `
        INSERT INTO faq (question,answer) VALUES ($1, $2) RETURNING id;
      `;
      const values = [question, answer];
      const result = await client.query(insertQuery, values);
  
      console.log(`faq added with ID: ${result.rows[0].id}`);
  
      res.status(201).json({
        msg: 'question added successfully',
        technologyId: result.rows[0].id,
      });
    } catch (error) {
      console.error('Error adding question :', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      await client.end();
    }
  };
  const getQ = async (req, res) => {
    const client = db.getClient();
  
    try {
      await client.connect();
  
      const query = `
        SELECT * FROM faq;
      `;
      const result = await client.query(query);
  
      const faq = result.rows;
  
      res.status(200).json(faq);
    } catch (error) {
      console.error('Error getting faq:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    } finally {
      await client.end();
    }
  };
  
  const verifyUser = async (req, res, next) => {
    const client = db.getClient();
  
    try {
      await client.connect();
      const { username } = req.method === "GET" ? req.query : req.body;
      console.log(username)
      const usersQuery = 'SELECT * FROM users WHERE username = $1';
      const clientQuery = 'SELECT * FROM client WHERE username = $1';
  
      const usersResult = await client.query(usersQuery, [username]);
      const clientResult = await client.query(clientQuery, [username]);
  
      if (usersResult.rows.length === 0 && clientResult.rows.length === 0) {
        return res.status(404).send({ error: "Can't find user" });
      }
  
      next();
    } catch (error) {
      console.error('Error verifying user:', error);
      return res.status(404).send({ error: "Authentication Error" });
    } finally {
      await client.end();
    }
  };
  

const register = async(req,res)=>{
  const client = db.getClient();
  try {
    await client.connect();
      const { username, password, profile, email } = req.body;        

      // check the existing user
      const existingUsernameQuery = 'SELECT * FROM users WHERE username = $1';
      const existingUsernameResult = await client.query(existingUsernameQuery, [username]);
  
      if (existingUsernameResult.rows.length > 0) {
        return res.status(400).send({ error: "Please use a unique username" });
      }

// check for existing email
const existingEmailQuery = 'SELECT * FROM users WHERE email = $1';
const existingEmailResult = await client.query(existingEmailQuery, [email]);

if (existingEmailResult.rows.length > 0) {
  return res.status(400).send({ error: "Please use a unique email" });
}

//hashed password 
const hashedPassword = await bcrypt.hash(password, 10);

const createUserQuery = 'INSERT INTO users (username, password, profile, email) VALUES ($1, $2, $3, $4)';
await client.query(createUserQuery, [username, hashedPassword, profile || '', email]);
 return res.status(201).send({ msg: "User Registered Successfully" })

  } catch (error) {
      return res.status(500).send(error);
  }
}

const login = async (req, res) => {
  const client = db.getClient();
  const { username, password } = req.body;
  console.log(username, password);

  await client.connect();

  try {
    // Check in the "users" table
    const usersQuery = 'SELECT * FROM users WHERE username = $1';
    const usersResult = await client.query(usersQuery, [username]);

    if (usersResult.rows.length > 0) {
      const user = usersResult.rows[0];
      const passwordCheck = await bcrypt.compare(password, user.password);

      if (!passwordCheck) {
        return res.status(400).send({ error: "Incorrect password" });
      }

      // JWT token with role and other information
      const token = jwt.sign(
        {
          userid: user.id,
          email: user.email,
          username: user.username,
          role: 'admin', // You can customize the role based on your schema
          // Include other user information if needed
        },
        "it9R9xOW3hULK96NXLjyMSnS6c+UtSYb78JGYFGJPGE=",
        { expiresIn: "24h" }
      );

      return res.status(200).send({
        msg: "Login successful",
        username: user.username,
        token,
      });
    }

    // Check in the "client" table
    const clientQuery = 'SELECT * FROM client WHERE username = $1';
    const clientResult = await client.query(clientQuery, [username]);

    if (clientResult.rows.length > 0) {
      const clientUser = clientResult.rows[0];
      const passwordCheck = await bcrypt.compare(password, clientUser.password);

      if (!passwordCheck) {
        return res.status(400).send({ error: "Incorrect password" });
      }

      // JWT token with role and other information
      const token = jwt.sign(
        {
          userid: clientUser.id,
          username: clientUser.username,
          email:clientUser.email,
          role: 'client', // You can customize the role based on your schema
          // Include other client information if needed
        },
        "it9R9xOW3hULK96NXLjyMSnS6c+UtSYb78JGYFGJPGE=",
        { expiresIn: "24h" }
      );

      return res.status(200).send({
        msg: "Login successful",
        username: clientUser.username,
        token,
      });
    }

    // If the username is not found in both tables
    return res.status(404).send({ error: "Username not found" });
  } catch (error) {
    console.error('Error in login:', error);
    return res.status(500).send({ error: "Internal Server Error" });
  } finally {
    await client.end();
  }
};


const getUser = async (req, res) => {
  const { username } = req.params;
  const client = db.getClient();

  try {
    await client.connect();

    if (!username) {
      return res.status(400).send({ error: "Invalid Username" });
    }

    // Check in the users table
    const getUserQueryUsers = 'SELECT * FROM users WHERE username = $1';
    const getUserResultUsers = await client.query(getUserQueryUsers, [username]);

    if (getUserResultUsers.rows.length > 0) {
      // User found in users table
      const { password, ...rest } = getUserResultUsers.rows[0];
      return res.status(200).send(rest);
    }

    // Check in the client table
    const getUserQueryClient = 'SELECT * FROM client WHERE username = $1';
    const getUserResultClient = await client.query(getUserQueryClient, [username]);

    if (getUserResultClient.rows.length > 0) {
      // User found in client table
      const { password, ...rest } = getUserResultClient.rows[0];
      return res.status(200).send(rest);
    }

    // User not found in both tables
    return res.status(404).send({ error: "Couldn't find the user" });
  } catch (error) {
    console.error('Error in getUser:', error);
    return res.status(500).send({ error: "Internal Server Error" });
  } finally {
    await client.end();
  }
};

const register_client = async(req,res)=>{
  const client = db.getClient();
  try {
    await client.connect();
      const { username, password, firstName,lastName,phoneNumber, email } = req.body;        
      console.log(username, password, firstName,lastName,phoneNumber, email);
      // check the existing user
      const existingUsernameQuery = 'SELECT * FROM client WHERE username = $1';
      const existingUsernameResult = await client.query(existingUsernameQuery, [username]);
  
      if (existingUsernameResult.rows.length > 0) {
        return res.status(400).send({ error: "Please use a unique username" });
      }

// check for existing email
const existingEmailQuery = 'SELECT * FROM client WHERE email = $1';
const existingEmailResult = await client.query(existingEmailQuery, [email]);

if (existingEmailResult.rows.length > 0) {
  return res.status(400).send({ error: "Please use a unique email" });
}

//hashed password 
const hashedPassword = await bcrypt.hash(password, 10);

const createUserQuery = 'INSERT INTO client (username, password, firstname, lastname, mobile, email) VALUES ($1, $2, $3, $4, $5, $6)';
await client.query(createUserQuery, [username, hashedPassword, firstName, lastName, phoneNumber, email]);
 return res.status(201).send({ msg: "client Registered Successfully" })

  } catch (error) {
      return res.status(500).send(error);
  }
}
const get_all_cls = async (req, res) => {
  const client = db.getClient();

  try {
    await client.connect();

    const query = `
      SELECT * FROM client;
    `;
    const result = await client.query(query);

    const faq = result.rows;

    res.status(200).json(faq);
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.end();
  }
};
const addUserService = async (req, res) => {
  const { userId, serviceId} = req.body;
  const dateObtained =  new Date();
  const etatDefaultValue = 'en cours de traitement'; // Default value for the "etat" column
  const client = db.getClient();

  try {
    await client.connect();

    // Check if the user already has the specified service
    const checkQuery = 'SELECT * FROM user_service WHERE user_id = $1 AND service_id = $2';
    const checkResult = await client.query(checkQuery, [userId, serviceId]);

    if (checkResult.rows.length > 0) {
      // User already has the specified service
      console.error('User already has the specified service. Cannot add another service.');
      return res.status(400).json({ error: 'User already has the specified service. Cannot add another service.' });
    }

    // If user doesn't have the specified service, proceed with the insertion
    const insertQuery = `
      INSERT INTO user_service (user_id, service_id, date_obtained, etat)
      VALUES ($1, $2, $3, $4)
    `;

    await client.query(insertQuery, [userId, serviceId, dateObtained, etatDefaultValue]);
    console.log('Data inserted into user_service table successfully');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error inserting data into user_service table:', error);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    await client.end();
  }
};


const getUserServiceInfo = async (req,res) => {
  const {userid} = req.body
  const client = db.getClient();

  try {
    await client.connect();
    console.log(userid);
    const query = `
      SELECT
        c.firstname || ' ' || c.lastname AS client_name,
        c.email AS client_email,
        t.title AS service_name,
        us.date_obtained,
        us.etat,
        us.service_id as id
      FROM user_service us
      JOIN client c ON us.user_id = c.id
      JOIN technologies t ON us.service_id = t.id
      WHERE us.user_id = $1;
    `;

    const result = await client.query(query, [userid]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error retrieving user service information:', error);
    throw error;
  } finally {
    await client.end();
  }
};
const deleteUserService = async (req, res) => {
  const client = db.getClient();
  const {userId, serviceId} = req.body;
  try {
    await client.connect();

    const query = `
      DELETE FROM user_service
      WHERE user_id = $1 AND service_id = $2;
    `;

    await client.query(query, [userId, serviceId]);

    res.json({ success: true, message: 'User service deleted successfully' });
  } catch (error) {
    console.error('Error deleting user service:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    await client.end();
  }
};
const addDemandeService = async (req, res) => {
  const { userId, serviceId, dateDemande } = req.body;
  console.log(userId, serviceId, dateDemande);
  const client = db.getClient();

  try {
    await client.connect();

    // Check if the user already has this service in attentes table
    const checkQuery = `
      SELECT * FROM attentes
      WHERE id_user = $1 AND id_service = $2
    `;

    const existingDemande = await client.query(checkQuery, [userId, serviceId]);

    if (existingDemande.rows.length > 0) {
      console.log('User already has this service');
      return res.status(400).send({ error: 'Vous obtenez déjà ce service !' });
    }

    // If the user doesn't have the service, proceed to insert the new demand
    const insertQuery = `
      INSERT INTO attentes (id_user, id_service, date_demande)
      VALUES ($1, $2, $3)
    `;

    await client.query(insertQuery, [userId, serviceId, dateDemande]);
    console.log('Data inserted into attentes table successfully');
    return res.status(201).send({ message: 'Demande added successfully' });
  } catch (error) {
    console.error('Error inserting data into attentes table:', error);
    return res.status(500).send({ error: 'Internal Server Error' });
  } finally {
    await client.end();
  }
};


const gererDemande = async (req, res) => {

  const { userId, serviceId, etat } = req.body;
  const currentDate = new Date(); // Get the current date
  const client = db.getClient();
  console.log(userId, serviceId, etat)
  try {
    await client.connect();

    let query;
    let parameters;

    if (etat === 'accept' || etat === 'refuser') {
      query = `
        UPDATE user_service
        SET etat = $1, date_obtained = $2
        WHERE user_id = $3 AND service_id = $4
      `;
      parameters = [etat, currentDate, userId, serviceId];
    } else {
      console.error('Invalid "etat" value. It should be either "accept" or "refuser".');
      return res.status(400).json({ error: 'Invalid "etat" value.' });
    }

    const result = await client.query(query, parameters);
    
    if (result.rowCount === 1) {
      console.log('Demande updated successfully');
      res.status(200).json({ success: true });
    } else {
      console.error('No matching record found for the given user and service.');
      res.status(404).json({ error: 'No matching record found.' });
    }
  } catch (error) {
    console.error('Error updating demande:', error);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    await client.end();
  }
};
const getAllUserServices = async (req, res) => {
  const client = db.getClient();
  console.log("hmmmmmmmmmmmmmmmmmmmmmmmmm");
  try {
    await client.connect();
    const query = `
      SELECT c.firstname || ' ' || c.lastname AS client_name , t.title AS service_name
      FROM user_service us
      JOIN client c ON us.user_id = c.id
      JOIN technologies t ON us.service_id = t.id
      ORDER BY us.date_obtained DESC;
    `;
    const result = await client.query(query);

    const userServices = result.rows;
    console.log('User hmm services retrieved successfully');
    res.status(200).json({ userServices });
  } catch (error) {
    console.error('Error retrieving user services:', error);
    res.status(500).json({ error: 'Internal server error.' });
  } finally {
    await client.end();
  }
};


// Example usage:
// getAllUserServices(req, res);



module.exports = {
 getAllUserServices,gererDemande,addDemandeService,deleteUserService,getUserServiceInfo,addUserService,get_all_cls,Send,getMail,deleteMail,addService,getService,addBlog,getBlogs,modifyBlog,deleteBlog,createTable,addTechno,getAllTechnos, modifyTechno,deleteTechno,addQ,getQ,register, verifyUser, login, getUser,register_client
  
}
//getUser,verifyUser,login,register

