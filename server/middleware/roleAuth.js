import Admin from '../models/Admin.js';

// Middleware to require admin role
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await Admin.findById(req.user.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    req.userRole = user.role;
    req.userPermissions = user.permissions;
    next();
  } catch (error) {
    console.error('Admin role check error:', error);
    res.status(500).json({
      success: false,
      error: 'Role verification failed'
    });
  }
};

// Middleware to require specific role
export const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = await Admin.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions'
        });
      }

      req.userRole = user.role;
      req.userPermissions = user.permissions;
      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({
        success: false,
        error: 'Role verification failed'
      });
    }
  };
};

// Middleware to check specific permissions
export const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const user = await Admin.findById(req.user.id);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found'
        });
      }

      // Admin has all permissions
      if (user.role === 'admin' || user.permissions.includes('all')) {
        req.userRole = user.role;
        req.userPermissions = user.permissions;
        return next();
      }

      // Check specific permission
      if (!user.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          error: `Permission required: ${permission}`
        });
      }

      req.userRole = user.role;
      req.userPermissions = user.permissions;
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        error: 'Permission verification failed'
      });
    }
  };
};

// Middleware to check if user can access leads (only admin)
export const requireLeadsAccess = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await Admin.findById(req.user.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Only admin can access leads
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Leads access restricted to admin only'
      });
    }

    req.userRole = user.role;
    req.userPermissions = user.permissions;
    next();
  } catch (error) {
    console.error('Leads access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Access verification failed'
    });
  }
};

// Middleware to check if user can access user management (only admin)
export const requireUserManagementAccess = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await Admin.findById(req.user.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Only admin can access user management
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'User management access restricted to admin only'
      });
    }

    req.userRole = user.role;
    req.userPermissions = user.permissions;
    next();
  } catch (error) {
    console.error('User management access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Access verification failed'
    });
  }
};

// Middleware to require admin or subadmin access
export const requireAdminOrSubAdmin = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await Admin.findById(req.user.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Only admin or subadmin can access
    if (!['admin', 'subadmin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access restricted to admin and subadmin only'
      });
    }

    req.userRole = user.role;
    req.userPermissions = user.permissions;
    next();
  } catch (error) {
    console.error('Admin/SubAdmin access check error:', error);
    res.status(500).json({
      success: false,
      error: 'Access verification failed'
    });
  }
};
