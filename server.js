const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname)));

// All routes serve the correct HTML file
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, req.path));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});