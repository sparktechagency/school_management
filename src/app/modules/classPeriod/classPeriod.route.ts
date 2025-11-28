import express from "express";
import { ClassPeriodController } from "./classPeriod.controller";

const router = express.Router();

router
    .post("/", ClassPeriodController.createClassPeriod)

    .get(
        "/specific_class_section", 
        ClassPeriodController.getClassPeriod
    )

    .patch(
        "/add", 
        ClassPeriodController.addSinglePeriod
    )

    .patch("/:classId/:section", ClassPeriodController.updateClassPeriod)

    .delete("/:classId/:section", ClassPeriodController.deleteClassPeriod);

export const ClassPeriodRoutes = router;
