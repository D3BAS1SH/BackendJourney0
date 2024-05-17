import {Router} from 'express'
import { } from '../controllers/video.controller.js'
import { upload } from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js'
import router from './user.routes.js'

const router=Router()