const { ApolloServer, gql } = require("apollo-server");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const saltRounds = 10; // The cost factor controls how much time is needed to calculate a single bcrypt hash. The higher the cost factor, the more hashing rounds are done.

const dbConfig = {
    host: "localhost",
    user: "XXXX",
    database: "db_graphql",
    password: "XXXX",
};
const initDbConnection = async () => {
    return await mysql.createConnection(dbConfig);
};

// Defining our schema
const typeDefs = gql`
    scalar Date
    # A "Client" type that defines the queryable fields for every client in our data source.

    # A "User" type that defines the queryable fields for every user in our data source.

    # The "Query" type is special: it lists all of the available queries that
    # clients can execute, along with the return type for each. In this
    # case, the "users" query returns an array of zero or more Users, and

    # If we need to get some data from db we can use like this
    type User {
        id: ID!
        firstname: String
        lastname: String
        email: String
        status: String
        client_id: ID
        password: String
    }
    input userInput {
        id: ID!
        firstname: String
        lastname: String
        email: String
        password: String
        status: String
        client_id: ID
    }

    # below the query is for fetching data from the database
    type Query {
        getUsers: [User]
    }
    type Mutation {
        loginUser(userInput: userInput): User
    }
`;

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves users from the "users" array above.
const resolvers = {
    Query: {
        getUsers: async () => {
            try {
                const connection = await initDbConnection();
                const [rows] = await connection.execute("SELECT * FROM users");
                return rows.map((row) => ({
                    id: row.id,
                    firstname: row.firstname,
                    lastname: row.lastname,
                    email: row.email,
                    status: row.status,
                    client_id: row.client_id,
                    // Ensure all fields required by your GraphQL schema are mapped here
                }));
            } catch (error) {
                // console.error("Error fetching users:", error);
                // Handle errors appropriately; you might want to throw an error or return an empty array
                throw new Error("Failed to fetch users");
            }
            // console.log("Users data: ", rows);
        },
    },
    Mutation: {
        loginUser: async (_, { userInput }) => {
            const connection = await initDbConnection();
            // Hash the password before storing it in the database
            const hashedPassword = await bcrypt.hash(
                userInput.password,
                saltRounds
            );

            const query = `INSERT INTO users (id, firstname, lastname,password, email, client_id, status, created_at, updated_at) VALUES (?, ?, ?, ?,?, ?,?,NOW(), NOW())`;

            // Extract the values from userInput to avoid SQL injection
            const values = [
                userInput.id,
                userInput.firstname,
                userInput.lastname,
                hashedPassword,
                userInput.email,
                userInput.client_id,
                userInput.status,
            ];

            // Execute the query with the values
            await connection.execute(query, values);

            // console.log("User data inserted successfully.");

            // Don't forget to close the connection when done
            connection.end();
        },
    },
};

// Creating the Apollo Server with our type definitions, resolvers, and telling it
// to use the playground (useful for testing and exploring your API)
const server = new ApolloServer({ typeDefs, resolvers });

// Starting the server
server.listen().then(({ url }) => {
    console.log(`🚀 Server ready at ${url}`);
});