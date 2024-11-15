const { request } = require("http");
const CONFIG = require("../../utils/appConfig");
const bcrypt = require("bcrypt");
const userService = require("../service/authQuery");
const BycrpytService = require("../service/bycrpty.service");
const jwtService = require("../service/jwt.service");
const sendEmail = require("../../utils/nodemailer");
const jwt = require("jsonwebtoken");
const generateCustomPassword = require('../../utils/passwordGenerator')
const authController = {
  async signUp(req, res) {
    try {
      const { first_name, last_name, email, password } = req.body;
      const userCheck = await userService().getUserByEmail(email);
      if (userCheck) {
        return res.reject(CONFIG.SUCCESS_CODE, CONFIG.EMAIL_ALREADY_EXISTS);
      }
      const hashedPassword = await BycrpytService.generatePassword(password);
      if (hashedPassword) {
        const requestObject = {
          first_name: first_name,
          last_name: last_name,
          email: email,
          password: hashedPassword,
        };
        const userCreated = await userService().createUser(requestObject);
        if (userCreated) {
          // Generate the token
          const jwtObj = {
            firstName: first_name,
            lastName: last_name,
            id: userCreated.user_id,
            email: email,
            accessToken: "",
            refreshToken: "",
          };
          const token = await jwtService.issueJwtToken(jwtObj);
          const refreshToken = await jwtService.issueJwtRefreshToken(jwtObj);
          jwtObj.accessToken = token;
          jwtObj.refreshToken = refreshToken;
          return res.success(
            CONFIG.SUCCESS_CODE,
            CONFIG.USER_CREATED_SUCCESSFULLY,
            jwtObj
          );
        } else {
          return res.reject(
            CONFIG.ERROR_CODE_INTERNAL_SERVER_ERROR,
            CONFIG.ERROR_WHILE_CREATING_USER
          );
        }
      } else {
        return res.reject(
          CONFIG.ERROR_CODE_INTERNAL_SERVER_ERROR,
          CONFIG.SOMETHING_WENT_WRONG
        );
      }
    } catch (error) {
      return res.reject(error.code, error.message);
    }
  },
  async customGoogleLogin(req, res) {
    const { token } = req.body;
    const isTokenValid = await jwtService.decodeToken(token)
    if (isTokenValid) {
      const userCheck = await userService().getUserByEmail(isTokenValid.email);
      if (userCheck) {
        const jwtObj = {
          firstName: userCheck.first_name,
          lastName: userCheck.last_name,
          id: userCheck.user_id,
          email: userCheck.email,
          accessToken: "",
          refreshToken: "",
        }
        const token = await jwtService.issueJwtToken(jwtObj);
        const refreshToken = await jwtService.issueJwtRefreshToken(jwtObj);
        jwtObj.accessToken = token;
        jwtObj.refreshToken = refreshToken;
        return res.success(
          CONFIG.SUCCESS_CODE,
          CONFIG.USER_FOUND, {
          token: token,
          refreshToken: refreshToken,
        }
        );
      } else {
        const hashedPassword = await BycrpytService.generatePassword(generateCustomPassword(10));

        const requestObject = {
          first_name: isTokenValid.given_name,
          last_name: isTokenValid.family_name,
          email: isTokenValid.email,
          password: hashedPassword
        }
        const userCreated = await userService().createUser(requestObject);
        if (userCreated) {
          // Generate the token
          const jwtObj = {
            firstName: requestObject.first_name,
            lastName: requestObject.last_name,
            id: userCreated.user_id,
            email: requestObject.email,
            accessToken: "",
            refreshToken: "",
          };
          const token = await jwtService.issueJwtToken(jwtObj);
          const refreshToken = await jwtService.issueJwtRefreshToken(jwtObj);
          jwtObj.accessToken = token;
          jwtObj.refreshToken = refreshToken;
          return res.success(
            CONFIG.SUCCESS_CODE,
            CONFIG.USER_CREATED_SUCCESSFULLY,
            jwtObj
          );
        } else {
          res.reject(CONFIG.INTERNAL_SERVER_ERROR, CONFIG.ERROR_WHILE_CREATING_USER)
        }
      }
    } else {
      res.reject(CONFIG.ERROR_CODE_BAD_REQUEST, CONFIG.INVALID_TOKEN)
    }
  },


  /**
 * @api {post} /api/v1/auth/login LogIn User
 * @apiName LogIn User
 * @apiGroup Users
 * @apiDescription User Service...

 */

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const userExist = await userService().getUserByEmail(email);
      if (userExist) {
        const verifyPassword = await BycrpytService.comparePassword(
          password,
          userExist.password
        );
        if (verifyPassword) {
          const obj = {
            firstName: userExist.first_name,
            lastName: userExist.last_name,
            id: userExist.user_id,
            email: userExist.email,
          };
          const jwtToken = await jwtService.issueJwtToken(obj);
          const refreshToken = await jwtService.issueJwtRefreshToken(obj);

          return res.success(CONFIG.SUCCESS_CODE, CONFIG.USER_FOUND, {
            token: jwtToken,
            refreshToken: refreshToken,
          });
        } else {
          return res.reject(CONFIG.SUCCESS_CODE, CONFIG.PASSWORD_INCORRECT);
        }
      } else {
        return res.reject(CONFIG.SUCCESS_CODE, CONFIG.USER_NOT_FOUND);
      }
    } catch (error) {
      return res.reject(error.code, error.message);
    }
  },
  async resetPassword(req, res) {
    try {
      const { currentPassword, newPassword, email } = req.body;
      const userExist = await userService().getUserByEmail(email);
      if (userExist) {
        const isCurrentPasswordSame = await BycrpytService.comparePassword(
          currentPassword,
          userExist.password
        );
        if (isCurrentPasswordSame) {
          const hashedPassword = await BycrpytService.generatePassword(
            newPassword
          );
          const passwordUpdated = await userService().updateUserPassword(
            hashedPassword,
            email
          );
          if (passwordUpdated) {
            res.success(
              CONFIG.SUCCESS_CODE,
              CONFIG.PASSWORD_SAVED_SUCCESSFULLY
            );
          } else {
            res.reject(
              CONFIG.SUCCESS_CODE,
              CONFIG.ERROR_WHILE_SAVING_THE_PASSWORD
            );
          }
        } else {
          res.reject(
            CONFIG.SUCCESS_CODE,
            CONFIG.CURRENT_PASSWORD_DOES_NOT_MATCH
          );
        }
      } else {
        return res.reject(CONFIG.SUCCESS_CODE, CONFIG.USER_NOT_FOUND);
      }
    } catch (error) {
      return res.status(error.code, error.message);
    }
  },
  async sendResetPasswordEmail(req, res) {
    try {
      const { email } = req.body;
      const userExist = await userService().getUserByEmail(email);
      if (userExist) {
        try {
          const obj = {
            email: userExist.email,
            first_name: userExist.first_name,
            last_name: userExist.last_name,
          };
          const token = await jwtService.issueJwtToken(obj);
          const mailSent = await sendEmail(
            "prafulkumarrajput14@gmail.com",
            "Reset Password",
            token
          );
          if (mailSent) {
            return res.reject(
              CONFIG.SUCCESS_CODE,
              CONFIG.RESET_PASSWORD_MAIL_SENT_SUCCESSFULLY
            );
          } else {
            return res.reject(
              CONFIG.ERROR_CODE_INTERNAL_SERVER_ERROR,
              CONFIG.ERROR_WHILE_SENDING_MAIL
            );
          }
        } catch (error) {
          return res.reject(error.code, error.message)
        }
      } else {
        return res.reject(CONFIG.SUCCESS_CODE, CONFIG.USER_NOT_FOUND);
      }
    } catch (error) {
      return res.reject(error.code, error.message);
    }
  },
  async forgotPassword(req, res) {
    try {
      const { token, password } = req.body;
      const tokenValie = await jwtService.verifyJwtToken(token);
      if (tokenValie) {
        const userExist = await userService().getUserByEmail(tokenValie.email);
        if (userExist) {
          const hashedPassword = await BycrpytService.generatePassword(
            password
          );
          const passwordUpdated = await userService().updateUserPassword(
            hashedPassword,
            tokenValie.email
          );
          if (passwordUpdated) {
            return res.success(
              CONFIG.SUCCESS_CODE,
              CONFIG.PASSWORD_SAVED_SUCCESSFULLY
            );
          } else {
            return res.reject(
              CONFIG.SUCCESS_CODE,
              CONFIG.ERROR_WHILE_SAVING_THE_PASSWORD
            );
          }
        } else {
          return res.reject(CONFIG.SUCCESS_CODE, CONFIG.USER_NOT_FOUND);
        }
      } else {
        return res.reject(CONFIG.SUCCESS_CODE, CONFIG.INVALID_TOKEN);
      }
    } catch (error) {
      return res.reject(error.code, error.message);
    }
  },
  async generateNewAccessToken(req, res) {
    const { token } = req.body;
    try {
      const isTokenValid = await jwtService.verifyJwtRefreshToken(token);
      const obj = {
        firstName: isTokenValid.firstName,
        lastName: isTokenValid.lastName,
        id: isTokenValid.userId,
        email: isTokenValid.email,
      };
      const accessToken = await jwtService.issueJwtToken(obj);
      return res.success(CONFIG.SUCCESS_CODE, { token: accessToken });
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.reject(CONFIG.ERROR_CODE_UNAUTHORIZED, CONFIG.TOKEN_EXPIRED);
      } else {
        return res.reject(CONFIG.ERROR_CODE_UNAUTHORIZED, CONFIG.INVALID_TOKEN);
      }
    }
  },
};

module.exports = authController;
