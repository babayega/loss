// import {GraphQLWebSocketClient} from 'graphql-request'
// import {GRAPHQL_TRANSPORT_WS_PROTOCOL} from 'graphql-ws'
// import WebSocketImpl, { Server as WebSocketServer } from 'ws'
import ReconnectingWebSocket from 'reconnecting-websocket';

export function createClient(url: string) {
    // return new Promise<GraphQLWebSocketClient>((resolve) => {
    //   const socket = new WebSocketImpl(url, GRAPHQL_TRANSPORT_WS_PROTOCOL)
    //   const client: GraphQLWebSocketClient = new GraphQLWebSocketClient(socket as unknown as WebSocket, {
    //     onAcknowledged: async (_p) => resolve(client),
    //   })
    // })
    return new ReconnectingWebSocket(url);
}