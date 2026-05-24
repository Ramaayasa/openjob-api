const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/auth');

// Handlers
const { registerUser, getUserById } = require('../handlers/userHandler');
const { createCompany, getAllCompanies, getCompanyById, updateCompany, deleteCompany } = require('../handlers/companyHandler');
const { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory } = require('../handlers/categoryHandler');
const { createJob, getAllJobs, getJobById, getJobsByCompanyId, getJobsByCategoryId, updateJob, deleteJob } = require('../handlers/jobHandler');
const { login, refreshToken, logout } = require('../handlers/authHandler');
const { applyForJob, getAllApplications, getApplicationById, getApplicationsByUserId, getApplicationsByJobId, updateApplicationStatus, deleteApplication } = require('../handlers/applicationHandler');
const { createBookmark, getAllUserBookmarks, getBookmarkById, deleteBookmark } = require('../handlers/bookmarkHandler');
const { getProfile, getProfileApplications, getProfileBookmarks } = require('../handlers/profileHandler');
const { uploadDocument, getAllDocuments, getDocumentById, deleteDocument } = require('../handlers/documentHandler');

// ─── USERS ───────────────────────────────────────────────────────────────────
router.post('/users', registerUser);
router.get('/users/:id', getUserById);

// ─── AUTHENTICATIONS ─────────────────────────────────────────────────────────
router.post('/authentications', login);
router.put('/authentications', refreshToken);
router.delete('/authentications', authMiddleware, logout);

// ─── COMPANIES ────────────────────────────────────────────────────────────────
router.get('/companies', getAllCompanies);
router.get('/companies/:id', getCompanyById);
router.post('/companies', authMiddleware, createCompany);
router.put('/companies/:id', authMiddleware, updateCompany);
router.delete('/companies/:id', authMiddleware, deleteCompany);

// ─── CATEGORIES ───────────────────────────────────────────────────────────────
router.get('/categories', getAllCategories);
router.get('/categories/:id', getCategoryById);
router.post('/categories', authMiddleware, createCategory);
router.put('/categories/:id', authMiddleware, updateCategory);
router.delete('/categories/:id', authMiddleware, deleteCategory);

// ─── JOBS ─────────────────────────────────────────────────────────────────────
// IMPORTANT: static routes before dynamic ones
router.get('/jobs/company/:companyId', getJobsByCompanyId);
router.get('/jobs/category/:categoryId', getJobsByCategoryId);
router.get('/jobs', getAllJobs);
router.get('/jobs/:id', getJobById);
router.post('/jobs', authMiddleware, createJob);
router.put('/jobs/:id', authMiddleware, updateJob);
router.delete('/jobs/:id', authMiddleware, deleteJob);

// ─── BOOKMARKS ────────────────────────────────────────────────────────────────
router.post('/jobs/:jobId/bookmark', authMiddleware, createBookmark);
router.get('/jobs/:jobId/bookmark/:id', authMiddleware, getBookmarkById);
router.delete('/jobs/:jobId/bookmark', authMiddleware, deleteBookmark);
router.get('/bookmarks', authMiddleware, getAllUserBookmarks);

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────
// IMPORTANT: static sub-routes before dynamic
router.get('/applications/user/:userId', authMiddleware, getApplicationsByUserId);
router.get('/applications/job/:jobId', authMiddleware, getApplicationsByJobId);
router.post('/applications', authMiddleware, applyForJob);
router.get('/applications', authMiddleware, getAllApplications);
router.get('/applications/:id', authMiddleware, getApplicationById);
router.put('/applications/:id', authMiddleware, updateApplicationStatus);
router.delete('/applications/:id', authMiddleware, deleteApplication);

// ─── DOCUMENTS ────────────────────────────────────────────────────────────────
router.get('/documents', getAllDocuments);
router.get('/documents/:id', getDocumentById);
router.post('/documents', authMiddleware, ...uploadDocument);
router.delete('/documents/:id', authMiddleware, deleteDocument);

// ─── PROFILE ──────────────────────────────────────────────────────────────────
router.get('/profile', authMiddleware, getProfile);
router.get('/profile/applications', authMiddleware, getProfileApplications);
router.get('/profile/bookmarks', authMiddleware, getProfileBookmarks);

module.exports = router;
