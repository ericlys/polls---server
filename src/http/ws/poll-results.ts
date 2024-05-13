import { FastifyInstance } from "fastify";
import { voting } from "../utils/voting-pub-sub";
import z from "zod";

export async function pollResults(app: FastifyInstance) {
  app.get('/polls/:pollId/results', {websocket: true}, (socket, request) => {
      const getPollParams = z.object({
        pollId: z.string().uuid()
      })

      const {pollId} = getPollParams.parse(request.params)

      voting.subscribe(pollId, (message) => {
        socket.send(JSON.stringify(message))
      })
    })
}
