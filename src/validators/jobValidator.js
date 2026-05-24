const Joi = require('joi');

const createJobSchema = Joi.object({
  company_id: Joi.string().required(),
  category_id: Joi.string().required(),
  title: Joi.string().required(),
  description: Joi.string().optional().allow('', null),
  job_type: Joi.string().valid('full-time', 'part-time', 'contract', 'freelance', 'internship').optional(),
  experience_level: Joi.string().valid('junior', 'mid', 'senior', 'lead', 'manager').optional(),
  location_type: Joi.string().valid('remote', 'on-site', 'onsite', 'hybrid').optional(),
  location_city: Joi.string().optional().allow('', null),
  salary_min: Joi.number().optional().allow(null),
  salary_max: Joi.number().optional().allow(null),
  is_salary_visible: Joi.boolean().optional(),
  status: Joi.string().valid('open', 'closed').optional(),
});

const updateJobSchema = Joi.object({
  company_id: Joi.string().optional(),
  category_id: Joi.string().optional(),
  title: Joi.string().optional(),
  description: Joi.string().optional().allow('', null),
  job_type: Joi.string().valid('full-time', 'part-time', 'contract', 'freelance', 'internship').optional(),
  experience_level: Joi.string().valid('junior', 'mid', 'senior', 'lead', 'manager').optional(),
  location_type: Joi.string().valid('remote', 'on-site', 'onsite', 'hybrid').optional(),
  location_city: Joi.string().optional().allow('', null),
  salary_min: Joi.number().optional().allow(null),
  salary_max: Joi.number().optional().allow(null),
  is_salary_visible: Joi.boolean().optional(),
  status: Joi.string().valid('open', 'closed').optional(),
});

module.exports = { createJobSchema, updateJobSchema };