import express from "express";
import { UsersService } from "./users.service.js";
import HttpError from "../../config/handler/HttpError/HttpError.js";
import { GetUserHistorySchema } from "./schema/users.schema";
import { formatZodValidationError } from "../auth/schema/auth.schema.js";


interface IUsersController {

    getUserQuizHistory: (req:express.Request,res:express.Response,next: express.NextFunction) => Promise<any>;

}

export const UsersController = (usersService: UsersService):IUsersController => {

    return {

        getUserQuizHistory: async(req, res, next) =>  {
           try {
                 
            const userId = req.user?.userId;
            if(!userId) {
               throw new HttpError("User not found",400,"Validation error",null)
            }

            const parsed = await GetUserHistorySchema.safeParseAsync(req.query);

             if(!parsed.success) {
                 return res.status(400).json({
                        error: 'Validation failed',
                        details: formatZodValidationError(parsed),
                      });
             }

            const result = await usersService.getUserHistory(userId,{status: parsed.data.status})
            
            res.status(200).json(result)

           } catch (error) {
            next(error)
           }
        }

    }
}