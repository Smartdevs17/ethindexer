import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { UsersService } from './users.service';

// Simple auth guard - in production, you'd want proper JWT or session-based auth
class WalletAuthGuard {
  canActivate(context: any) {
    const request = context.switchToHttp().getRequest();
    const address = request.headers['x-wallet-address'];
    return !!address;
  }
}

@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * Get or create user by wallet address
   * POST /users/auth
   */
  @Post('auth')
  async authenticateUser(@Body() body: { address: string; ensName?: string }) {
    try {
      const { address, ensName } = body;
      
      if (!address) {
        return {
          success: false,
          error: 'Wallet address is required',
          timestamp: new Date(),
        };
      }

      this.logger.log(`🔐 Authenticating user: ${address}`);
      
      const user = await this.usersService.getOrCreateUser(address, ensName);
      
      return {
        success: true,
        user: {
          id: user.id,
          address: user.address,
          ensName: user.ensName,
          createdAt: user.createdAt,
          addresses: user.addresses,
          recentJobs: user.jobs
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Authentication failed:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user profile
   * GET /users/profile/:address
   */
  @Get('profile/:address')
  async getUserProfile(@Param('address') address: string) {
    try {
      this.logger.log(`👤 Getting profile for address: ${address}`);
      
      const user = await this.usersService.getUserByAddress(address);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date(),
        };
      }

      const stats = await this.usersService.getUserStats(user.id);
      
      return {
        success: true,
        user: {
          id: user.id,
          address: user.address,
          ensName: user.ensName,
          createdAt: user.createdAt,
          addresses: user.addresses,
          stats
        },
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to get user profile:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user jobs
   * GET /users/:address/jobs?limit=20&offset=0
   */
  @Get(':address/jobs')
  async getUserJobs(
    @Param('address') address: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    try {
      const limitNum = parseInt(limit) || 20;
      const offsetNum = parseInt(offset) || 0;

      this.logger.log(`📋 Getting jobs for user ${address} (limit: ${limitNum}, offset: ${offsetNum})`);
      
      const user = await this.usersService.getUserByAddress(address);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date(),
        };
      }

      const result = await this.usersService.getUserJobs(user.id, limitNum, offsetNum);
      
      return {
        success: true,
        ...result,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to get user jobs:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Add saved address
   * POST /users/:address/addresses
   */
  @Post(':address/addresses')
  async addUserAddress(
    @Param('address') address: string,
    @Body() body: { name: string; address: string }
  ) {
    try {
      const { name, address: addressToAdd } = body;
      
      if (!name || !addressToAdd) {
        return {
          success: false,
          error: 'Name and address are required',
          timestamp: new Date(),
        };
      }

      this.logger.log(`📍 Adding address for user ${address}: ${name} (${addressToAdd})`);
      
      const user = await this.usersService.getUserByAddress(address);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date(),
        };
      }

      const userAddress = await this.usersService.addUserAddress(user.id, name, addressToAdd);
      
      return {
        success: true,
        address: userAddress,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to add user address:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Remove saved address
   * DELETE /users/:address/addresses/:addressId
   */
  @Delete(':address/addresses/:addressId')
  async removeUserAddress(
    @Param('address') address: string,
    @Param('addressId') addressId: string
  ) {
    try {
      this.logger.log(`🗑️ Removing address ${addressId} for user ${address}`);
      
      const user = await this.usersService.getUserByAddress(address);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date(),
        };
      }

      await this.usersService.removeUserAddress(user.id, addressId);
      
      return {
        success: true,
        message: 'Address removed successfully',
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to remove user address:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user addresses
   * GET /users/:address/addresses
   */
  @Get(':address/addresses')
  async getUserAddresses(@Param('address') address: string) {
    try {
      this.logger.log(`📍 Getting addresses for user: ${address}`);
      
      const user = await this.usersService.getUserByAddress(address);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date(),
        };
      }

      const addresses = await this.usersService.getUserAddresses(user.id);
      
      return {
        success: true,
        addresses,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to get user addresses:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get user statistics
   * GET /users/:address/stats
   */
  @Get(':address/stats')
  async getUserStats(@Param('address') address: string) {
    try {
      this.logger.log(`📊 Getting stats for user: ${address}`);
      
      const user = await this.usersService.getUserByAddress(address);
      
      if (!user) {
        return {
          success: false,
          error: 'User not found',
          timestamp: new Date(),
        };
      }

      const stats = await this.usersService.getUserStats(user.id);
      
      return {
        success: true,
        stats,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('❌ Failed to get user stats:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
      };
    }
  }
}
