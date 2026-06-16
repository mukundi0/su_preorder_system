import express from 'express'
import { createIssue, getAllIssues, updateIssueStatus } from '../controllers/issueController.js'
import { authenticate, authorise } from '../middleware/auth.js'

const router = express.Router()

router.post('/',    authenticate, createIssue)
router.get('/',     authenticate, authorise('admin', 'kitchen_staff'), getAllIssues)
router.patch('/:id/status', authenticate, authorise('admin', 'kitchen_staff'), updateIssueStatus)

export default router
