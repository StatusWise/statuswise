import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import MyApp, { ConfigContext } from '../../pages/_app'
import configService from '../../utils/config'

// Mock the config service
jest.mock('../../utils/config', () => ({
  loadConfig: jest.fn(),
  isBillingEnabled: jest.fn(),
  isFeatureEnabled: jest.fn()
}))

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn()
}))

// Mock component to test with
const TestComponent = () => {
  const { config, isLoaded, isBillingEnabled, isFeatureEnabled } = React.useContext(ConfigContext)
  
  return (
    <div>
      <div data-testid="loaded">{isLoaded ? 'loaded' : 'loading'}</div>
      <div data-testid="billing">{isBillingEnabled() ? 'billing-enabled' : 'billing-disabled'}</div>
      <div data-testid="feature">{isFeatureEnabled('test_feature') ? 'feature-enabled' : 'feature-disabled'}</div>
      {config && <div data-testid="config-data">{JSON.stringify(config)}</div>}
    </div>
  )
}

describe('MyApp', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show loading screen while config is loading', async () => {
    // Make loadConfig take some time
    let resolveConfig
    const configPromise = new Promise((resolve) => {
      resolveConfig = resolve
    })
    configService.loadConfig.mockReturnValue(configPromise)

    render(<MyApp Component={TestComponent} pageProps={{}} />)

    // Should show loading screen
    expect(screen.getByText('Loading StatusWise')).toBeInTheDocument()
    expect(screen.getByText('Initializing application configuration...')).toBeInTheDocument()

    // Resolve the config
    act(() => {
      resolveConfig({ billing_enabled: true })
    })

    await waitFor(() => {
      expect(screen.queryByText('Loading StatusWise')).not.toBeInTheDocument()
    })
  })

  it('should load config successfully and provide context', async () => {
    const mockConfig = {
      billing_enabled: true,
      features: { test_feature: true }
    }

    configService.loadConfig.mockResolvedValue(mockConfig)
    configService.isBillingEnabled.mockReturnValue(true)
    configService.isFeatureEnabled.mockImplementation((feature) => 
      feature === 'test_feature'
    )

    await act(async () => {
      render(<MyApp Component={TestComponent} pageProps={{}} />)
    })

    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('loaded')
    })

    expect(screen.getByTestId('billing')).toHaveTextContent('billing-enabled')
    expect(screen.getByTestId('feature')).toHaveTextContent('feature-enabled')
    expect(screen.getByTestId('config-data')).toHaveTextContent(JSON.stringify(mockConfig))
  })

  it('should handle config loading failure gracefully', async () => {
    configService.loadConfig.mockRejectedValue(new Error('Network error'))
    configService.isBillingEnabled.mockReturnValue(false)
    configService.isFeatureEnabled.mockReturnValue(false)

    await act(async () => {
      render(<MyApp Component={TestComponent} pageProps={{}} />)
    })

    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('loaded')
    })

    // Should still render the component with disabled features
    expect(screen.getByTestId('billing')).toHaveTextContent('billing-disabled')
    expect(screen.getByTestId('feature')).toHaveTextContent('feature-disabled')
  })

  it('should call configService.loadConfig on initialization', async () => {
    configService.loadConfig.mockResolvedValue({})

    await act(async () => {
      render(<MyApp Component={TestComponent} pageProps={{}} />)
    })

    expect(configService.loadConfig).toHaveBeenCalledTimes(1)
  })

  it('should provide default context values', async () => {
    configService.loadConfig.mockResolvedValue(null)
    configService.isBillingEnabled.mockReturnValue(false)
    configService.isFeatureEnabled.mockReturnValue(false)

    await act(async () => {
      render(<MyApp Component={TestComponent} pageProps={{}} />)
    })

    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('loaded')
    })

    expect(screen.getByTestId('billing')).toHaveTextContent('billing-disabled')
    expect(screen.getByTestId('feature')).toHaveTextContent('feature-disabled')
  })

  it('should handle partial config data', async () => {
    const partialConfig = {
      billing_enabled: true
    }

    configService.loadConfig.mockResolvedValue(partialConfig)
    configService.isBillingEnabled.mockReturnValue(true)
    configService.isFeatureEnabled.mockReturnValue(false)

    await act(async () => {
      render(<MyApp Component={TestComponent} pageProps={{}} />)
    })

    await waitFor(() => {
      expect(screen.getByTestId('loaded')).toHaveTextContent('loaded')
    })

    expect(screen.getByTestId('billing')).toHaveTextContent('billing-enabled')
    expect(screen.getByTestId('config-data')).toHaveTextContent(JSON.stringify(partialConfig))
  })

  it('should render loading screen with proper styling', async () => {
    let resolveConfig
    const configPromise = new Promise((resolve) => {
      resolveConfig = resolve
    })
    configService.loadConfig.mockReturnValue(configPromise)

    const { container } = render(<MyApp Component={TestComponent} pageProps={{}} />)

    // Check for loading screen elements
    expect(screen.getByText('Loading StatusWise')).toBeInTheDocument()
    expect(screen.getByText('Initializing application configuration...')).toBeInTheDocument()
    
    // Check for loading spinner (has specific classes)
    const spinner = container.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveClass('rounded-full', 'h-12', 'w-12', 'border-b-2', 'border-blue-600')

    // Resolve to finish test
    act(() => {
      resolveConfig({})
    })

    await waitFor(() => {
      expect(screen.queryByText('Loading StatusWise')).not.toBeInTheDocument()
    })
  })

  it('should pass pageProps to the component', async () => {
    const mockPageProps = { testProp: 'test-value' }
    const ComponentWithProps = ({ testProp }) => (
      <div data-testid="page-props">{testProp}</div>
    )

    configService.loadConfig.mockResolvedValue({})

    await act(async () => {
      render(<MyApp Component={ComponentWithProps} pageProps={mockPageProps} />)
    })

    await waitFor(() => {
      expect(screen.getByTestId('page-props')).toHaveTextContent('test-value')
    })
  })
}) 