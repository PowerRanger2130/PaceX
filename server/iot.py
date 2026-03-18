import socket
import logging

logger = logging.getLogger(__name__)


class RelayController:
    """
    Controller for SR-201 relay module.
    
    Commands:
    - 1X enables relay #X
    - 2X disables relay #X
    """
    
    def __init__(self, host: str = '192.168.88.100', port: int = 6722, switches: int = 2, timeout: float = 1):
        self.host = host
        self.port = port
        self.switches = switches
        self.timeout = timeout

        # Try to disable all relays on initialization, but don't fail if device is unavailable
        for i in range(switches):
            try:
                self.disable_relay(i + 1)
            except Exception as e:
                logger.warning(f"Could not disable relay {i + 1} during initialization: {e}")
        
        # Track current relay index and state for round-robin clicking
        self._current_relay = 0
        self._relay_states = [False] * switches  # False = disabled, True = enabled
    
    def _send_command(self, command: bytes) -> bytes | None:
        """Send a command to the relay and return the response."""
        try:
            with socket.create_connection((self.host, self.port), timeout=self.timeout) as s:
                s.sendall(command)
                return s.recv(1024)
        except (socket.timeout, socket.error, OSError) as e:
            logger.warning(f"Failed to send command to relay at {self.host}:{self.port}: {e}")
            return None
        
    def _send_all(self, command: bytes) -> bytes | None:
        """Send a command to the relay and return the response."""
        try:
            with socket.create_connection((self.host, self.port), timeout=self.timeout) as s:
                s.sendall(command)
                return s.recv(1024)
        except (socket.timeout, socket.error, OSError) as e:
            logger.warning(f"Failed to send command to relay at {self.host}:{self.port}: {e}")
            return None
    
    def enable_relay(self, relay: int) -> bytes | None:
        """Enable a specific relay (1-indexed)."""
        if relay < 1 or relay > self.switches:
            raise ValueError(f"Relay must be between 1 and {self.switches}")
        command = f'1{relay}'.encode()
        return self._send_command(command)
    
    def disable_relay(self, relay: int) -> bytes | None:
        """Disable a specific relay (1-indexed)."""
        if relay < 1 or relay > self.switches:
            raise ValueError(f"Relay must be between 1 and {self.switches}")
        command = f'2{relay}'.encode()
        return self._send_command(command)
    
    def enable_all(self) -> bytes | None:
        """Enables all relays"""
        command = '1X'.encode()
        return self._send_all(command)
    
    def disable_all(self) -> bytes | None:
        """Disables all relays"""
        command = '2X'.encode()
        return self._send_all(command)
    
    def click(self) -> bytes | None:
        """
        Perform a click action, cycling through relays and toggling their states.
        Each call uses a different relay to avoid delays.
        """
        # Get current relay (0-indexed internally, 1-indexed for commands)
        relay_index = self._current_relay
        relay_num = relay_index + 1
        
        # Toggle the state
        current_state = self._relay_states[relay_index]
        if current_state:
            response = self.disable_relay(relay_num)
        else:
            response = self.enable_relay(relay_num)
        
        # Update tracked state
        self._relay_states[relay_index] = not current_state
        
        # Move to next relay for next click (round-robin)
        self._current_relay = (self._current_relay + 1) % self.switches
        
        return response


if __name__ == '__main__':
    controller = RelayController(switches=2)
    n = 8
    controller.disable_all()
    for i in range(n):
        controller.click()
        pass