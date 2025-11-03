import { PrismaClient } from "@prisma/client";
import {prisma} from "../../lib/prisma.js"


export class ScheduleService {

private prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }


  

}