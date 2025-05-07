# bonsale-outbound-campaign-dashboard

## Environment Variables (.env)

This project uses the following environment variables to configure its behavior. Create a `.env` file in the root directory of the project and set the variables as described below.

### Required Environment Variables

| Variable Name                     | Default Value           | Description                              |
|-----------------------------------|-------------------------|------------------------------------------|
| `VITE_HTTP_HOST`                  | `http://<bonsale-outbound-campaign DOMAIN>` | The HTTP host address for the backend API. |
| `VITE_WS_PORT_OUTBOUND_CAMPAIGM_V2` | `ws://<bonsale-outbound-campaign DOMAIN>`   | The WebSocket host address for outbound campaign updates. |

### Example `.env` File

```env
# Backend API host address
VITE_HTTP_HOST=http://<bonsale-outbound-campaign DOMAIN>

# WebSocket host address
VITE_WS_PORT_OUTBOUND_CAMPAIGM_V2=ws://<bonsale-outbound-campaign DOMAIN>