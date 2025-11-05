import { PrismaClient } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { startQuizSchemaDto } from "./schema/quiz.schema.js";



export class QuizService {

    private prisma: PrismaClient;
    constructor() {
        this.prisma = prisma
    }


    startQuiz({userId}: startQuizSchemaDto) {}

}