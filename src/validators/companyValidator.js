const Joi = require('joi');

const createCompanySchema = Joi.object({
  name: Joi.string().required(),
  location: Joi.string().required(),
  description: Joi.string().optional().allow('', null),
  website: Joi.string().uri().optional().allow('', null),
  logo_url: Joi.string().optional().allow('', null),
});

const updateCompanySchema = Joi.object({
  name: Joi.string().optional(),
  location: Joi.string().optional(),
  description: Joi.string().optional().allow('', null),
  website: Joi.string().uri().optional().allow('', null),
  logo_url: Joi.string().optional().allow('', null),
});

module.exports = { createCompanySchema, updateCompanySchema };
