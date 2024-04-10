const express = require("express");
const database = require("./config/db");
const cors = require('cors');
const ExcelJS = require('exceljs');

const app = express();
app.use(cors());
app.use(express.json());

// Function to check and create tables if they don't exist
const checkAndCreateTables = () => {
  const createUserTableQuery = `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    website VARCHAR(255),
    city VARCHAR(255),
    company VARCHAR(255)
  )`;

  const createPostTableQuery = `CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId INT,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    FOREIGN KEY (userId) REFERENCES users(id)
  )`;

  // Execute queries to create tables
  database.query(createUserTableQuery, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
      return;
    }
    console.log('Users table checked - exists or successfully created if not existing');
  });

  database.query(createPostTableQuery, (err) => {
    if (err) {
      console.error('Error creating posts table:', err);
      return;
    }
    console.log('Posts table checked - exists or successfully created if not existing');
  });
};

// Endpoint to add a user
app.post('/addUser', (req, res) => {
  const { name, email, phone, website, city, company } = req.body;
  const insertQuery = 'INSERT INTO users (name, email, phone, website, city, company) VALUES (?, ?, ?, ?, ?, ?)';
  const values = [name, email, phone, website, city, company];

  database.query(insertQuery, values, (error, results) => {
    if (error) {
      console.error('Error adding user:', error);
      res.status(500).send({ message: 'Error adding user', error });
      return;
    }
    res.status(201).send({ message: 'User added successfully', id: results.insertId });
  });
});

// Endpoint to check if a user exists based on their ID
app.get('/checkUser/:userId', (req, res) => {
  const userId = req.params.userId;
  const checkUserQuery = 'SELECT EXISTS (SELECT 1 FROM users WHERE id = ?) AS userExists';

  database.query(checkUserQuery, [userId], (error, results) => {
    if (error) {
      console.error('Error checking user:', error);
      res.status(500).send({ message: 'Error checking user', error });
      return;
    }

    const userExists = results[0].userExists === 1;
    res.status(200).json({ exists: userExists });
  });
});

// Endpoint to add posts for a user
app.post('/addPosts', (req, res) => {
  const { userId, posts } = req.body;

  // Insert each post into the database
  posts.forEach(post => {
    const { title, body } = post;
    const insertQuery = 'INSERT INTO posts (userId, title, body) VALUES (?, ?, ?)';
    const values = [userId, title, body];

    database.query(insertQuery, values, (error, results) => {
      if (error) {
        console.error('Error adding post:', error);
        return;
      }
    });
  });

  res.status(201).send({ message: 'Posts added successfully' });
});

// Endpoint to check if posts exist for a user
app.get('/checkPosts/:userId', (req, res) => {
  const userId = req.params.userId;
  const checkPostsQuery = 'SELECT EXISTS (SELECT 1 FROM posts WHERE userId = ?) AS postsExist';

  database.query(checkPostsQuery, [userId], (error, results) => {
    if (error) {
      console.error('Error checking posts:', error);
      res.status(500).send({ message: 'Error checking posts', error });
      return;
    }

    const postsExist = results[0].postsExist === 1;
    res.status(200).json({ exists: postsExist });
  });
});

// Endpoint to download posts for a user in Excel format
app.get('/downloadPosts/:userId', async (req, res) => {
  const userId = req.params.userId;
  const getPostsQuery = 'SELECT p.id AS postId, p.userId, p.title, p.body FROM posts p WHERE p.userId = ?'; // Include postId and userId in the query

  try {
    const posts = await new Promise((resolve, reject) => {
      database.query(getPostsQuery, [userId], (error, results) => {
        if (error) {
          console.error('Error fetching posts from database:', error);
          reject(error);
          return;
        }
        resolve(results);
      });
    });

    if (posts.length === 0) {
      console.error('No posts found for the user with ID:', userId);
      res.status(404).send({ message: 'No posts found for the user' });
      return;
    }

    // Create Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Posts');

    // Add column headers including userId, postId, title, and body
    worksheet.columns = [
      { header: 'User ID', key: 'userId', width: 10 },
      { header: 'Post ID', key: 'postId', width: 10 },
      { header: 'Title', key: 'title', width: 40 },
      { header: 'Body', key: 'body', width: 100 }
    ];

    // Add data to worksheet
    posts.forEach(post => {
      worksheet.addRow(post);
    });

    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=posts.xlsx');

    // Send Excel file as response
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error downloading posts:', error);
    res.status(500).send({ message: 'Error downloading posts', error });
  }
});



// Basic route for homepage
app.get('/', (req, res) => {
  res.json({ "Message": "HomePage" });
});

// Check and create tables at startup
checkAndCreateTables();

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
