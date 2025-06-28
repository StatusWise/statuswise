import axios from 'axios'
import configService from '../../utils/config'

// Mock axios
jest.mock('axios')
const mockedAxios = axios

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn()
}))

describe('ConfigService', () => {
  beforeEach(() => {
    // Reset the config service state before each test
    configService.config = null
    configService.loaded = false
    configService.loading = false
    
    // Clear all mocks
    jest.clearAllMocks()
  })

  describe('loadConfig', () => {
    it('should load configuration from backend successfully', async () => {
      const mockConfig = {
        billing_enabled: true,
        features: {
          subscription_management: true,
          billing_webhooks: true,
          subscription_limits: true
        }
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockConfig })

      const result = await configService.loadConfig()

      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_URL}/config`,
        { timeout: 5000 }
      )
      expect(result).toEqual(mockConfig)
      expect(configService.isLoaded()).toBe(true)
      expect(configService.getConfig()).toEqual(mockConfig)
    })

    it('should return cached config on subsequent calls', async () => {
      const mockConfig = {
        billing_enabled: true,
        features: {}
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockConfig })

      // First call
      await configService.loadConfig()
      expect(mockedAxios.get).toHaveBeenCalledTimes(1)

      // Second call should use cache
      const result = await configService.loadConfig()
      expect(mockedAxios.get).toHaveBeenCalledTimes(1) // Should not call again
      expect(result).toEqual(mockConfig)
    })

    it('should handle loading state correctly', async () => {
      const mockConfig = {
        billing_enabled: false,
        features: {}
      }

      // Create a promise that we can control
      let resolvePromise
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockedAxios.get.mockReturnValueOnce(promise)

      // Start loading
      const loadPromise = configService.loadConfig()
      expect(configService.loading).toBe(true)

      // While loading, subsequent calls should return the same promise
      const secondLoadPromise = configService.loadConfig()
      expect(loadPromise).toStrictEqual(secondLoadPromise)

      // Resolve the promise
      resolvePromise({ data: mockConfig })
      await loadPromise

      expect(configService.loading).toBe(false)
      expect(configService.isLoaded()).toBe(true)
    })

    it('should use fallback config when backend request fails', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))

      const result = await configService.loadConfig()

      const expectedFallback = {
        billing_enabled: false,
        features: {
          subscription_management: false,
          billing_webhooks: false,
          subscription_limits: false
        }
      }

      expect(result).toEqual(expectedFallback)
      expect(configService.getConfig()).toEqual(expectedFallback)
    })

    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded')
      timeoutError.code = 'ECONNABORTED'
      mockedAxios.get.mockRejectedValueOnce(timeoutError)

      const result = await configService.loadConfig()

      expect(result.billing_enabled).toBe(false)
    })
  })

  describe('feature checking methods', () => {
    beforeEach(async () => {
      const mockConfig = {
        billing_enabled: true,
        features: {
          subscription_management: true,
          billing_webhooks: true,
          subscription_limits: true
        }
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockConfig })
      await configService.loadConfig()
    })

    it('should return correct billing status', () => {
      expect(configService.isBillingEnabled()).toBe(true)
    })

    it('should return correct feature status', () => {
      expect(configService.isFeatureEnabled('subscription_management')).toBe(true)
      expect(configService.isFeatureEnabled('billing_webhooks')).toBe(true)
      expect(configService.isFeatureEnabled('nonexistent_feature')).toBe(false)
    })
  })

  describe('when config is not loaded', () => {
    it('should return false for all feature checks', () => {
      expect(configService.isBillingEnabled()).toBe(false)
      expect(configService.isFeatureEnabled('any_feature')).toBe(false)
    })

    it('should return null for getConfig', () => {
      expect(configService.getConfig()).toBe(null)
    })

    it('should return false for isLoaded', () => {
      expect(configService.isLoaded()).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle missing features object', async () => {
      const mockConfig = {
        billing_enabled: true,
        // Missing features object
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockConfig })
      await configService.loadConfig()

      expect(configService.isFeatureEnabled('any_feature')).toBe(false)
    })

    it('should handle null config gracefully', () => {
      configService.config = null

      expect(configService.isBillingEnabled()).toBe(false)
      expect(configService.isFeatureEnabled('any_feature')).toBe(false)
    })

    it('should handle undefined feature names', () => {
      configService.config = {
        billing_enabled: true,
        features: {}
      }

      expect(configService.isFeatureEnabled(undefined)).toBe(false)
      expect(configService.isFeatureEnabled(null)).toBe(false)
      expect(configService.isFeatureEnabled('')).toBe(false)
    })
  })

  describe('singleton behavior', () => {
    it('should maintain state across imports', async () => {
      const mockConfig = {
        billing_enabled: true,
        features: {}
      }

      mockedAxios.get.mockResolvedValueOnce({ data: mockConfig })
      await configService.loadConfig()

      // Import the service again (simulating different module importing it)
      const { default: configService2 } = await import('../../utils/config')

      // Should have the same state
      expect(configService2.isLoaded()).toBe(true)
      expect(configService2.getConfig()).toEqual(mockConfig)
      expect(configService === configService2).toBe(true)
    })
  })
}) 