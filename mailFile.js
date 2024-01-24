const express = require('express');
const multer = require('multer');
const path = require('path');
const bodyparser = require('body-parser');
const session = require('express-session');
const uuid = require('uuid');
const app = express();
const Controller = require('./Controller');
const router = express.Router();


const port = 3000;



// In memory Storage for user data and uploaded files 
const users = [];

const userFiles = {};



//MiddleWare
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(session({secret:'here we will give session key from application component in browser' , reverse:true , saveUninitialized:true}))


//Now we will set up he multer for file uploads

const stoarge = multer.memoryStorage();
const upload = multer({storage:storage});






// // Lets handle all the axios errors and other methods here only 


const serverErrorResult = (res, error) => {
  console.error('Stack Trace:', error.stack);
  return res.status(500).json({ message: error.message, error: error.stack, detail: error.detail });
}




// Fetch user email by user ID
const fetchUserByEmailId = async (id) => {
  const { rows } = await pool.query('SELECT email FROM User_table where id  = $1', [id]);
  return rows[0].email;
};

// Fetch user name by user ID
const fetchUserNameById = async (id) => {
  const { rows } = await pool.query("SELECT name FROM user_table WHERE id = $1", [id]);
  return rows[0].name;
};





const extractUserNameandEmailFromToken = async function (req, res) {
  // try {
  const token = req.headers["x-api-key"];

  // Check if the token is present
  if (!token) {
    return sendErrorResult(res, HTTP_BAD_REQUEST, accessToken);
  }

  // Decode the token
  const decoded = await jwt.verify(token, scrtCode);


  // Extract username and pwd from token
  return {
  
    user_name: await fetchUserNameById(decoded.user_id),
    user_email: await fetchUserByEmailId(decoded.user_id),
   
  };
 
};






//Lets resgister the username and pwd for that we will use post query for it 


//ViewModels :-


const userNamePwd = async(req , res)=>{
    
  const { username, password } = req.body;
  await extractUserNameandEmailFromToken(req , res);
  const userExists = users.some((user) => user.username === username);

  if (userExists) {
    return res.status(400).send('Username already exists');
  }

  const newUser = { username, password };
  users.push(newUser);
  res.status(201).send('Registration successful');
  
}





const login = async(req , res)=>{
    
    
   const { username, password } = req.body;
   
   await extractUserNameandEmailFromToken(req , res);
   
   const user = users.find((user) => user.username === username && user.password === password);

  if (user) {
    req.session.user = user;
    res.status(200).send('Login successful');
  } else {
    res.status(401).send('Invalid credentials');
  }
    
    
    
}



const fileUpload = async()=>{
    await extractUserNameandEmailFromToken(req , res);
    
    
     if (!req.session.user) {
    return res.status(401).send('Unauthorized');
  }

  const file = req.file;
  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  const uniqueCode = uuid.v4().slice(0, 6);
  const userId = req.session.user.username;

  userFiles[userId] = userFiles[userId] || [];
  userFiles[userId].push({ file, uniqueCode });

  res.status(200).json({ uniqueCode });
}




const getFiles = async(req , res)=>{
    await extractUserNameandEmailFromToken(req , res);
    
  if (!req.session.user) {
    return res.status(401).send('Unauthorized');
  }

  const userId = req.session.user.username;
  const files = userFiles[userId] || [];

  res.status(200).json(files.map((item) => ({ uniqueCode: item.uniqueCode })));
    
}





const removeMethods = async(req , res)=>{
    
    await extractUserNameandEmailFromToken(req , res);
    
    
     if (!req.session.user) {
    return res.status(401).send('Unauthorized');
  }

  const userId = req.session.user.username;
  const { uniqueCode } = req.body;

  if (!uniqueCode) {
    return res.status(400).send('Invalid request');
  }

  const userFilesList = userFiles[userId] || [];
  const index = userFilesList.findIndex((item) => item.uniqueCode === uniqueCode);

  if (index !== -1) {
    userFilesList.splice(index, 1);
    return res.status(200).send('File removed successfully');
  } else {
    return res.status(404).send('File not found');
  }
    
}




const DownloadFiles = async(req , res)=>{
     const { uniqueCode } = req.params;

  for (const userId in userFiles) {
    const userFilesList = userFiles[userId];
    const fileItem = userFilesList.find((item) => item.uniqueCode === uniqueCode);

    if (fileItem) {
      const file = fileItem.file;
      res.set({
        'Content-Type': file.mimetype,
        'Content-Disposition': `attachment; filename=${file.originalname}`,
      });
      return res.send(file.buffer);
    }
  }

  res.status(404).send('File not found');
    
    
    
}






//Controllers:----



const AddUserNamePwdController = async(req , res)=>{
    
    
    try {
        
        await userNamePwd(req , res);
        
    }catch(error){
        
        return serverErrorResult(req , res);
        
        
    }
}











const AddLoginController = async(req , res)=>{
    
    
    try {
        
        await login(req , res);
        
    }catch(error){
        
        return serverErrorResult(req , res);
        
        
    }
}






const AddfileUploadController = async(req , res)=>{
    
    
    try {
        
        await fileUpload(req , res);
        
    }catch(error){
        
        return serverErrorResult(req , res);
        
        
    }
}








const getFilesMethodController = async(req , res)=>{
    
    
    try {
        
        await getFiles(req , res);
        
    }catch(error){
        
        return serverErrorResult(req , res);
        
        
    }
}






const removeFilesController = async(req , res)=>{
    
    
    try {
        
        await removeMethods(req , res);
        
    }catch(error){
        
        return serverErrorResult(req , res);
        
        
    }
}






const getDownloadFilesController = async(req , res)=>{
    
    
    try {
        
        await DownloadFiles(req , res);
        
    }catch(error){
        
        return serverErrorResult(req , res);
        
        
    }
}






//Routes of all methods


app.post('/register', AddUserNamePwdController);

app.post('/login', AddLoginController);

app.post('/upload', upload.single('file'), AddfileUploadController);

app.get('/files', getFilesMethodController);

app.post('/remove', removeFilesController);

app.get('/download/:uniqueCode', getDownloadFilesController);




// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});




























