const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const { Client } = require('pg');

const app = express();
app.use(cors());

app.use(express.json()); // For JSON data

const router = express.Router();

const { gererDemande,getAllUserServices,addDemandeService,deleteUserService,getUserServiceInfo,register_client,get_all_cls,Send,addUserService, getMail,deleteMail,addService,getService,addBlog,getBlogs,modifyBlog,deleteBlog,createTable,addTechno,getAllTechnos,modifyTechno,deleteTechno ,addQ,getQ,register, verifyUser, login, getUser} = require('../controller/appController.js');
// Define your routes using the router
router.post('/sendEmail', Send);
router.get('/getAllEmails', getMail);
router.post('/delMail', deleteMail);
router.post('/addService', addService);
router.get('/getService', getService);
router.post('/addBlog', addBlog);
router.get('/getBlog', getBlogs);
router.post('/modBlog', modifyBlog);
router.post('/delBlog', deleteBlog);
router.post('/createt', createTable);
router.post('/addTech', addTechno);
router.get('/getTech', getAllTechnos);
router.post('/modTech', modifyTechno);
router.post('/delTech', deleteTechno);
router.post('/addQ', addQ);
router.post('/adduserservice', addUserService);
router.post('/adddemandeservice', addDemandeService);
router.post('/gererdemandeservice', gererDemande);
router.get('/getalluserservice', getAllUserServices);

router.post('/getuserservice', getUserServiceInfo);
router.post('/deluserservice', deleteUserService);
router.get('/getQ', getQ);
router.get('/getcs', get_all_cls);
router.post('/register', register);
router.post('/registerc', register_client);
router.post('/authenticate', verifyUser, (req, res) => res.end());
router.post('/login', verifyUser, login);
router.get('/user/:username', getUser);

app.use('/.netlify/functions/api', router);

// Close the database connection when the app shuts down
process.on('SIGINT', async () => {
  try {
    console.log("Closing the database connection.");
    await client.end();
    process.exit();
  } catch (err) {
    console.error("Error closing the database connection:", err);
    process.exit(1);
  }
});

// Export the handler function
module.exports.handler = serverless(app);
