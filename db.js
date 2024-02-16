const { Client } = require('pg');

const getClient = () => {
  return new Client({
    connectionString: "postgresql://abdallah:lmv1Px24z_r8Mu4Sa7L6sA@crab-forager-8531.7tc.aws-eu-central-1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full",
    ssl: {
      rejectUnauthorized: false,
    },
  });
};

module.exports = { getClient };
