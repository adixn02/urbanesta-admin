/**
 * Response Sanitizer Utility
 * 
 * This utility sanitizes API responses to prevent data leaks by:
 * 1. Removing sensitive fields (passwords, phone numbers, emails, IPs)
 * 2. Excluding internal metadata (timestamps, version fields)
 * 3. Applying role-based field restrictions
 * 4. Masking or removing PII (Personally Identifiable Information)
 */

/**
 * Mask email address - shows only first letter and domain
 * Example: john.doe@example.com -> j***@example.com
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email;
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 1) return email;
  const masked = localPart[0] + '*'.repeat(Math.min(localPart.length - 1, 3)) + '@' + domain;
  return masked;
};

/**
 * Mask phone number - shows only last 4 digits
 * Example: 919034779597 -> ******9597
 */
const maskPhone = (phone) => {
  if (!phone) return phone;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 4) return '****';
  return '*'.repeat(cleaned.length - 4) + cleaned.slice(-4);
};

/**
 * Sanitize City response - removes internal fields
 */
export const sanitizeCityResponse = (city, userRole = 'admin') => {
  if (!city) return null;
  
  const sanitized = city.toObject ? city.toObject() : city;
  
  return {
    _id: sanitized._id,
    name: sanitized.name,
    state: sanitized.state,
    country: sanitized.country,
    isActive: sanitized.isActive,
    backgroundImage: sanitized.backgroundImage,
    localities: sanitized.localities?.map(loc => ({
      _id: loc._id,
      name: loc.name,
      isActive: loc.isActive
    })) || []
    // Excluded: createdAt, updatedAt, __v
  };
};

/**
 * Sanitize Builder response - removes contact info and internal fields
 */
export const sanitizeBuilderResponse = (builder, userRole = 'admin') => {
  if (!builder) return null;
  
  const sanitized = builder.toObject ? builder.toObject() : builder;
  
  const response = {
    _id: sanitized._id,
    name: sanitized.name,
    slug: sanitized.slug,
    description: sanitized.description,
    logo: sanitized.logo,
    backgroundImage: sanitized.backgroundImage,
    isActive: sanitized.isActive,
    establishedYear: sanitized.establishedYear,
    headquarters: sanitized.headquarters,
    website: sanitized.website,
    displayOrder: sanitized.displayOrder,
    totalProjects: sanitized.totalProjects,
    completedProjects: sanitized.completedProjects,
    ongoingProjects: sanitized.ongoingProjects,
    upcomingProjects: sanitized.upcomingProjects,
    locations: sanitized.locations || [],
    specialties: sanitized.specialties || [],
    awards: sanitized.awards || [],
    amenities: sanitized.amenities || [],
    constructionDetails: sanitized.constructionDetails || {},
    configurations: sanitized.configurations || []
    // Excluded: contactInfo (email, phone, address), timestamps, __v
  };
  
  // Only admins can see contact info (if needed in future)
  // For now, we exclude it completely for security
  if (userRole === 'admin' && sanitized.contactInfo) {
    // Even admins shouldn't see this in list views - only in detail views if needed
    // response.contactInfo = sanitized.contactInfo;
  }
  
  return response;
};

/**
 * Sanitize Admin user response - removes sensitive admin data
 */
export const sanitizeAdminResponse = (admin, requestingUser = null) => {
  if (!admin) return null;
  
  const sanitized = admin.toObject ? admin.toObject() : admin;
  
  // Base response - minimal fields
  const response = {
    _id: sanitized._id,
    name: sanitized.name,
    role: sanitized.role,
    isActive: sanitized.isActive,
    permissions: sanitized.permissions || [],
    createdAt: sanitized.createdAt
  };
  
  // Only if requesting user is admin and viewing their own profile or another admin
  if (requestingUser && requestingUser.role === 'admin') {
    // Admins can see more details including phone numbers for admin/subadmin management
    if (sanitized.updatedAt) response.updatedAt = sanitized.updatedAt;
    if (sanitized.phoneNumber) response.phoneNumber = sanitized.phoneNumber; // Include phone number for admin/subadmin visibility
    if (sanitized.lastLogin) response.lastLogin = sanitized.lastLogin; // Include last login for admin management
    
    // Only show createdBy name, not full details
    if (sanitized.createdBy && typeof sanitized.createdBy === 'object') {
      response.createdBy = {
        _id: sanitized.createdBy._id,
        name: sanitized.createdBy.name
        // Excluded: phoneNumber, email
      };
    } else if (sanitized.createdBy) {
      response.createdBy = sanitized.createdBy;
    }
  }
  
  // Excluded: password, lastActivity, loginCount, email (phoneNumber is included for admin role)
  return response;
};

/**
 * Sanitize User response - removes sensitive user data
 */
export const sanitizeUserResponse = (user, userRole = 'admin') => {
  if (!user) return null;
  
  const sanitized = user.toObject ? user.toObject() : user;
  
  const response = {
    _id: sanitized._id,
    name: sanitized.name,
    city: sanitized.city,
    role: sanitized.role,
    isActive: sanitized.isActive,
    createdAt: sanitized.createdAt
  };
  
  // Only admins can see limited additional info
  if (userRole === 'admin') {
    response.lastLogin = sanitized.lastLogin;
    response.loginCount = sanitized.loginCount;
    // Mask email and phone even for admins in API responses
    response.email = sanitized.email ? maskEmail(sanitized.email) : null;
    response.phoneNumber = sanitized.phoneNumber ? maskPhone(sanitized.phoneNumber) : null;
  }
  
  // Excluded: full email, full phoneNumber, lastActivity, permissions, watchlist, myProperties, profile
  return response;
};

/**
 * Sanitize Lead response - removes PII (email, phone, IP, user agent)
 */
export const sanitizeLeadResponse = (lead, userRole = 'admin') => {
  if (!lead) return null;
  
  const sanitized = lead.toObject ? lead.toObject() : lead;
  
  const response = {
    _id: sanitized._id,
    name: sanitized.name,
    // Masked email - only show domain part
    email: sanitized.email ? maskEmail(sanitized.email) : null,
    // Masked phone - only show last 4 digits
    phone: sanitized.phone ? maskPhone(sanitized.phone) : null,
    city: sanitized.city,
    propertyId: sanitized.propertyId,
    propertyName: sanitized.propertyName,
    propertyUrl: sanitized.propertyUrl,
    formType: sanitized.formType,
    message: sanitized.message,
    status: sanitized.status,
    priority: sanitized.priority,
    source: sanitized.source,
    tags: sanitized.tags || [],
    followUpDate: sanitized.followUpDate,
    isActive: sanitized.isActive,
    createdAt: sanitized.createdAt,
    updatedAt: sanitized.updatedAt
  };
  
  // Populated fields - sanitize them too
  if (sanitized.assignedTo) {
    if (typeof sanitized.assignedTo === 'object' && sanitized.assignedTo !== null) {
      response.assignedTo = {
        _id: sanitized.assignedTo._id || null,
        name: sanitized.assignedTo.name || null
        // Excluded: email, phoneNumber
      };
    } else {
      response.assignedTo = sanitized.assignedTo;
    }
  }
  
  if (sanitized.propertyInterest) {
    if (typeof sanitized.propertyInterest === 'object' && sanitized.propertyInterest !== null) {
      // Handle both regular (title/location) and builder (projectName/fullAddress) properties
      response.propertyInterest = {
        _id: sanitized.propertyInterest._id || null,
        title: sanitized.propertyInterest.title || sanitized.propertyInterest.projectName || null,
        location: sanitized.propertyInterest.location || sanitized.propertyInterest.fullAddress || null,
        type: sanitized.propertyInterest.type || null
      };
    } else {
      response.propertyInterest = sanitized.propertyInterest;
    }
  }
  
  // Notes - sanitize addedBy
  if (sanitized.notes && Array.isArray(sanitized.notes)) {
    response.notes = sanitized.notes.map(note => {
      if (!note) return null;
      return {
        _id: note._id || null,
        note: note.note || null,
        addedAt: note.addedAt || null,
        addedBy: note.addedBy && typeof note.addedBy === 'object' && note.addedBy !== null
          ? { _id: note.addedBy._id || null, name: note.addedBy.name || null }
          : note.addedBy
      };
    }).filter(note => note !== null);
  }
  
  // Excluded: metadata (IP address, user agent), full email, full phone
  return response;
};

/**
 * Sanitize array of responses
 */
export const sanitizeArray = (items, sanitizer, userRole = 'admin', requestingUser = null) => {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    if (sanitizer === sanitizeAdminResponse) {
      return sanitizer(item, requestingUser);
    }
    return sanitizer(item, userRole);
  });
};

/**
 * Check if user has permission to see sensitive data
 */
export const canViewSensitiveData = (userRole, resourceType) => {
  // Only admins can see sensitive data
  if (userRole !== 'admin') return false;
  
  // Define which resources have sensitive data
  const sensitiveResources = ['leads', 'admin', 'users'];
  return sensitiveResources.includes(resourceType);
};

export default {
  sanitizeCityResponse,
  sanitizeBuilderResponse,
  sanitizeAdminResponse,
  sanitizeUserResponse,
  sanitizeLeadResponse,
  sanitizeArray,
  canViewSensitiveData
};

