const aws = require("aws-sdk");
const postgres = require("pg");

/*


// Fast Implementation
let db;
async function initDatabaseConnection() {
  console.log("Initializing database connection!");
  const secretsManager = new aws.SecretsManager({ region: "eu-west-1" });

  const dbSecret = await secretsManager
    .getSecretValue({ SecretId: process.env.DB_SECRET_ARN })
    .promise();

  const dbCredentials = JSON.parse(dbSecret.SecretString);

  db = new postgres.Client({
    host: dbCredentials.host,
    port: dbCredentials.port,
    user: dbCredentials.username,
    password: dbCredentials.password,
  });

  await db.connect();
}

exports.handler = async (event) => {
  if (!db) await initDatabaseConnection();

  const result = await db.query("SELECT NOW()");

  console.log(result);
};
*/

// Slow Implementation
exports.handler = async (event) => {
  const secretsManager = new aws.SecretsManager({ region: "eu-west-1" });

  const dbSecret = await secretsManager
    .getSecretValue({ SecretId: process.env.DB_SECRET_ARN })
    .promise();

  const dbCredentials = JSON.parse(dbSecret.SecretString);

  const db = new postgres.Client({
    host: dbCredentials.host,
    port: dbCredentials.port,
    user: dbCredentials.username,
    password: dbCredentials.password,
  });

  await db.connect();

  const result = await db.query("SELECT NOW()");

  console.log(result);

  await db.end();

  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
};
