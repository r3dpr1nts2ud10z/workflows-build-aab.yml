import { Router, type IRouter } from "express";
import healthRouter from "./health";
import profileRouter from "./profile";
import receiptsRouter from "./receipts";
import dashboardRouter from "./dashboard";
import whopRouter from "./whop";
import payoutsRouter from "./payouts";
import roqqetRouter from "./roqqet";
import trackRouter from "./track";
import adsRouter from "./ads";
import adminRouter from "./admin";
import adminZetaRouter from "./admin-zeta";

const router: IRouter = Router();

router.use(healthRouter);
router.use(profileRouter);
router.use(receiptsRouter);
router.use(dashboardRouter);
router.use(whopRouter);
router.use(payoutsRouter);
router.use(roqqetRouter);
router.use(trackRouter);
router.use(adsRouter);
router.use(adminRouter);
router.use(adminZetaRouter);

export default router;
