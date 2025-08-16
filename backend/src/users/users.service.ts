import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

export interface CreateUserDto {
  address: string;
  ensName?: string;
}

export interface CreateUserAddressDto {
  userId: string;
  name: string;
  address: string;
}

export interface UserStats {
  totalJobs: number;
  completedJobs: number;
  activeJobs: number;
  savedAddresses: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get or create user by wallet address
   */
  async getOrCreateUser(address: string, ensName?: string) {
    try {
      this.logger.log(`🔍 Getting or creating user for address: ${address}`);

      // Try to find existing user
      let user = await this.prisma.user.findUnique({
        where: { address: address.toLowerCase() },
        include: {
          addresses: true,
          jobs: {
            orderBy: { createdAt: 'desc' },
            take: 10
          }
        }
      });

      // Create user if doesn't exist
      if (!user) {
        this.logger.log(`👤 Creating new user for address: ${address}`);
        user = await this.prisma.user.create({
          data: {
            address: address.toLowerCase(),
            ensName: ensName || null
          },
          include: {
            addresses: true,
            jobs: {
              orderBy: { createdAt: 'desc' },
              take: 10
            }
          }
        });
        this.logger.log(`✅ Created user: ${user.id}`);
      }

      return user;
    } catch (error) {
      this.logger.error(`❌ Failed to get or create user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          addresses: true,
          jobs: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      return user;
    } catch (error) {
      this.logger.error(`❌ Failed to get user by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user by wallet address
   */
  async getUserByAddress(address: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { address: address.toLowerCase() },
        include: {
          addresses: true,
          jobs: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      return user;
    } catch (error) {
      this.logger.error(`❌ Failed to get user by address: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add saved address for user
   */
  async addUserAddress(userId: string, name: string, address: string) {
    try {
      this.logger.log(`📍 Adding address for user ${userId}: ${name} (${address})`);

      const userAddress = await this.prisma.userAddress.create({
        data: {
          userId,
          name,
          address: address.toLowerCase()
        }
      });

      this.logger.log(`✅ Added user address: ${userAddress.id}`);
      return userAddress;
    } catch (error) {
      this.logger.error(`❌ Failed to add user address: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove saved address for user
   */
  async removeUserAddress(userId: string, addressId: string) {
    try {
      this.logger.log(`🗑️ Removing address ${addressId} for user ${userId}`);

      const userAddress = await this.prisma.userAddress.findFirst({
        where: {
          id: addressId,
          userId
        }
      });

      if (!userAddress) {
        throw new Error(`Address not found or not owned by user`);
      }

      await this.prisma.userAddress.delete({
        where: { id: addressId }
      });

      this.logger.log(`✅ Removed user address: ${addressId}`);
      return { success: true };
    } catch (error) {
      this.logger.error(`❌ Failed to remove user address: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user addresses
   */
  async getUserAddresses(userId: string) {
    try {
      const addresses = await this.prisma.userAddress.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });

      return addresses;
    } catch (error) {
      this.logger.error(`❌ Failed to get user addresses: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user jobs with pagination
   */
  async getUserJobs(userId: string, limit = 20, offset = 0) {
    try {
      const [jobs, total] = await Promise.all([
        this.prisma.indexingJob.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset
        }),
        this.prisma.indexingJob.count({
          where: { userId }
        })
      ]);

      return {
        jobs,
        total,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get user jobs: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const [totalJobs, completedJobs, activeJobs, savedAddresses] = await Promise.all([
        this.prisma.indexingJob.count({
          where: { userId }
        }),
        this.prisma.indexingJob.count({
          where: { 
            userId,
            status: 'completed'
          }
        }),
        this.prisma.indexingJob.count({
          where: { 
            userId,
            status: {
              in: ['active', 'processing', 'pending']
            }
          }
        }),
        this.prisma.userAddress.count({
          where: { userId }
        })
      ]);

      return {
        totalJobs,
        completedJobs,
        activeJobs,
        savedAddresses
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get user stats: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user ENS name
   */
  async updateUserEnsName(userId: string, ensName: string) {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { ensName }
      });

      this.logger.log(`✅ Updated ENS name for user ${userId}: ${ensName}`);
      return user;
    } catch (error) {
      this.logger.error(`❌ Failed to update user ENS name: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all users (for admin purposes)
   */
  async getAllUsers(limit = 50, offset = 0) {
    try {
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: {
              select: {
                jobs: true,
                addresses: true
              }
            }
          }
        }),
        this.prisma.user.count()
      ]);

      return {
        users,
        total,
        pagination: {
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };
    } catch (error) {
      this.logger.error(`❌ Failed to get all users: ${error.message}`);
      throw error;
    }
  }
}
