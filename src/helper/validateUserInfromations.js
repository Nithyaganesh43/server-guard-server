const User = require("../models/user");

async function validateUserInfromations( username, password, platform, email) {
    const user = await User.findOne({ platform, email });
    if (!user) throw new Error("User Not Found");

    if (user.userName && user.password) throw new Error("User Already Registered You Can Login Now");
 

    const isUserNameUnique = await User.findOne({ userName: username });
    if (isUserNameUnique) throw new Error("Username already taken");

    if (password.length < 5 || password.length > 50) 
        throw new Error("Password must be between 5 and 50 characters");
  
}

module.exports = validateUserInfromations;
