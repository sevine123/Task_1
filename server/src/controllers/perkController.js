import Joi from 'joi';
import { Perk } from '../models/Perk.js';

// validation schema for creating/updating a perk
const perkSchema = Joi.object({
  // check that title is at least 2 characters long, and required
  title: Joi.string().min(2).required(),
  // description is optional
  description: Joi.string().allow(''),
  // category must be one of the defined values, default to 'other'
  category: Joi.string().valid('food','tech','travel','fitness','other').default('other'),
  // discountPercent must be between 0 and 100, default to 0
  discountPercent: Joi.number().min(0).max(100).default(0),
  // merchant is optional
  merchant: Joi.string().allow('')

}); 

  

// Filter perks by exact title match if title query parameter is provided 
export async function filterPerks(req, res, next) {
  try {
    const { title } = req.query     ;
    if (title) {
      const perks = await Perk.find ({ title: title}).sort({ createdAt: -1 });
      console.log(perks);
      res.status(200).json(perks)
    }
    else {
      res.status(400).json({ message: 'Title query parameter is required' });
    }
  } catch (err) { next(err); }
}


// Get a single perk by ID 
export async function getPerk(req, res, next) {
  try {
    const perk = await Perk.findById(req.params.id);
    console.log(perk);
    if (!perk) return res.status(404).json({ message: 'Perk not found' });
    res.json({ perk });
    // next() is used to pass errors to the error handling middleware
  } catch (err) { next(err); }
}

// get all perks
export async function getAllPerks(req, res, next) {
  try {
    const perks = await Perk.find().sort({ createdAt: -1 });
    res.json(perks);
  } catch (err) { next(err); }
}

// Create a new perk
export async function createPerk(req, res, next) {
  try {
    // validate request body against schema
    const { value, error } = perkSchema.validate(req.body);
    if (error) return res.status(400).json({ message: error.message });
     // ...value spreads the validated fields
    const doc = await Perk.create({ ...value});
    res.status(201).json({ perk: doc });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Duplicate perk for this merchant' });
    next(err);
  }
}
// TODO
// Update an existing perk by ID and validate only the fields that are being updated 
export async function updatePerk(req, res, next) {
 
   try {
    const { id } = req.params;
    // Destructure ONLY the title from the request body
    const { title } = req.body;

    // 1. Check if the title was provided at all in the request body
    if (title === undefined) {
      return res.status(400).json({ message: 'Title field is required for this update endpoint.' });
    }

    // 2. Define a Joi schema specifically for validating ONLY the title field
    const updatePayloadSchema = Joi.object({
      // Extracts the title validation rules (min(2).required()) from the main schema
      title: perkSchema.extract('title'), 
    }).unknown(false); // Disallow any other fields

    // 3. Prepare the update object and validate it
    const update = { title }; // Update object contains only the title

    // Validate the provided title against the specific update schema
    const { value: validatedUpdate, error } = updatePayloadSchema.validate(update);
    
    if (error) {
      // If validation fails (e.g., title is too short)
      return res.status(400).json({ message: error.message });
    }

    // 4. Find and update the perk using $set
    // $set ensures ONLY the fields in 'validatedUpdate' (which is just the title) are changed, 
    // preserving all other fields (description, category, etc.) in the database document.
    const doc = await Perk.findByIdAndUpdate(
      id,
      { $set: validatedUpdate }, 
      { new: true, runValidators: true } // {new: true} returns the updated document
    );

    if (!doc) {
      return res.status(404).json({ message: 'Perk not found' });
    }

    res.status(200).json({ perk: doc });

  } catch (err) {
    // Handle duplicate key error (if the new title violates a unique index)
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Duplicate title already exists' });
    }
    next(err);
  }
}


// Delete a perk by ID
export async function deletePerk(req, res, next) {
  try {
    const doc = await Perk.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Perk not found' });
    res.json({ ok: true });
  } catch (err) { next(err); }
}
