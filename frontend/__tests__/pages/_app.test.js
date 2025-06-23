import React from 'react'
import { render } from '@testing-library/react'
import App from '../../pages/_app'

// Mock component for testing
const MockComponent = () => <div>Test Component</div>

describe('App Component', () => {
  test('renders the app component with given page component', () => {
    const mockPageProps = { testProp: 'testValue' }
    
    const { container } = render(
      <App Component={MockComponent} pageProps={mockPageProps} />
    )
    
    expect(container.firstChild).toBeInTheDocument()
  })
}) 