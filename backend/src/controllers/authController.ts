import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/authMiddleware';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body;

    // Validate input
    if (!username || !email || !password) {
      res.status(400).json({ message: 'All fields are required' });
      return;
    }

    // FIX MEDIUM-3: Batch email/username checks into single query with $or
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    }).select('email username').lean();

    if (existingUser) {
      if (existingUser.email === email) {
        res.status(400).json({
          message: 'Email already registered',
          field: 'email'
        });
        return;
      }
      if (existingUser.username === username) {
        res.status(400).json({
          message: 'Username already taken',
          field: 'username'
        });
        return;
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      username,
      email,
      password: hashedPassword,
    });

    await user.save();

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
    });

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        totalScore: user.totalScore,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken({
      userId: user._id.toString(),
      username: user.username,
    });

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        wins: user.wins,
        losses: user.losses,
        draws: user.draws,
        totalScore: user.totalScore,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.userId).select('-password');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      wins: user.wins,
      losses: user.losses,
      draws: user.draws,
      totalScore: user.totalScore,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

