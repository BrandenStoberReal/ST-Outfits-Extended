import {dragElementWithSave} from '../src/common/shared';

// Create a mock for localStorage
const localStorageMock = (function () {
    let store: any = {};
    return {
        getItem: function (key: string) {
            return store[key] || null;
        },
        setItem: function (key: string, value: string) {
            store[key] = value.toString();
        },
        removeItem: function (key: string) {
            delete store[key];
        },
        clear: function () {
            store = {};
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
});

declare const global: any;

describe('dragElementWithSave', () => {
    let element: HTMLElement;
    let mockJQueryElement: any;
    let originalJQuery: any;

    beforeEach(() => {
        // Create a mock element
        element = document.createElement('div');
        element.id = 'test-panel';
        document.body.appendChild(element);

        // Create a mock jQuery object
        mockJQueryElement = {
            css: jest.fn(),
            on: jest.fn(),
            off: jest.fn(),
            find: jest.fn(() => ({
                first: () => mockJQueryElement
            })),
            length: 1,
            [0]: element
        };

        // Mock jQuery globally
        originalJQuery = global.$;
        global.$ = jest.fn((selector: any) => {
            if (selector === element) {
                return mockJQueryElement;
            }
            if (typeof selector === 'string') {
                return mockJQueryElement;
            }
            return mockJQueryElement;
        });
    });

    afterEach(() => {
        // Clean up
        document.body.removeChild(element);
        global.$ = originalJQuery;
        jest.clearAllMocks();
    });

    test('should initialize drag functionality without errors', () => {
        // Mock the CSS function to return expected values
        mockJQueryElement.css.mockImplementation((prop: any) => {
            if (typeof prop === 'object') {
                // It's a set operation, just record it
                return mockJQueryElement;
            }
            // It's a get operation - we don't expect this to be called in our implementation
            return '0px';
        });

        expect(() => {
            dragElementWithSave(element, 'test-storage-key');
        }).not.toThrow();

        // Verify that the element was processed correctly
        expect(global.$).toHaveBeenCalledWith(element);
        expect(mockJQueryElement.css).toHaveBeenCalledWith({
            position: 'fixed',
            cursor: 'move'
        });
    });
});