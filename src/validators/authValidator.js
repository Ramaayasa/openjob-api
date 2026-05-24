const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const deleteAuthSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

const createApplicationSchema = Joi.object({
  user_id: Joi.string().required(),
  job_id: Joi.string().required(),
  status: Joi.string().valid('pending', 'reviewed', 'accepted', 'rejected').optional(),
  cover_letter: Joi.string().optional().allow('', null),
});

const updateApplicationSchema = Joi.object({
  status: Joi.string().valid('pending', 'reviewed', 'accepted', 'rejected').required(),
});

module.exports = {
  loginSchema,
  refreshTokenSchema,
  deleteAuthSchema,
  createApplicationSchema,
  updateApplicationSchema,
};
