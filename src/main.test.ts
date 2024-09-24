import { ping } from './utils'

/**
 * @jest-environment jsdom
 */
// the above comment helps
test('test-ping', () => {
  expect(ping()).toBe('pong')
});
