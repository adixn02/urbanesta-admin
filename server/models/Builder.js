import mongoose from "mongoose";

const builderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, required: true },
    description: String,
    logo: String,
    backgroundImage: String,
    isActive: { type: Boolean, default: true },
    establishedYear: Number,
    totalProjects: Number,
    completedProjects: Number,
    ongoingProjects: Number,
    upcomingProjects: Number,
    locations: [String], // Array of locations
    specialties: [String], // Array of specialties
    awards: [String], // Array of awards
    website: String,
    contactInfo: {
      email: String,
      phone: String,
      address: String,
    },
    properties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property", // Assuming you will create a Property model later
      },
    ],
    displayOrder: { type: Number, default: 0 },
    headquarters: String,
    // New fields for amenities/facilities
    amenities: [{
      name: { type: String, required: true },
      image: String, // URL of amenity image
      isActive: { type: Boolean, default: true }
    }],
    // New fields for construction details
    constructionDetails: {
      status: {
        type: String,
        enum: ['upcoming', 'ready-to-move', 'under-construction', 'new-launch'],
        default: 'upcoming'
      },
      reraDescription: String,
      reraNumber: String
    },
    // New fields for configuration options
    configurations: [{
      type: { type: String, required: true },
      isEnabled: { type: Boolean, default: true },
      isForRegularProperty: { type: Boolean, default: true },
      isForBuilderProperty: { type: Boolean, default: true }
    }]
  },
  { timestamps: true }
);

const Builder = mongoose.model("Builder", builderSchema);

export default Builder;
