import z from "zod"
import { randomUUID } from "node:crypto"
import { FastifyInstance } from "fastify"
import { prisma } from "../../lib/prisma"
import { redis } from "../../lib/redis"
import { voting } from "../utils/voting-pub-sub"

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (req, rep) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid()
    })
  
    const voteOnPollParams = z.object({
      pollId: z.string().uuid()
    })
    
    const {pollId} = voteOnPollParams.parse(req.params)
    const {pollOptionId} = voteOnPollBody.parse(req.body)

    let  {sessionId}  = req.cookies

    if(sessionId) {
      const userPreviewVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            pollId,
            sessionId
          }
        }
      })

      if (userPreviewVoteOnPoll && userPreviewVoteOnPoll.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: {
            id: userPreviewVoteOnPoll.id
          }
        })

        const votes = await redis.zincrby(pollId, -1, userPreviewVoteOnPoll.pollOptionId)

        voting.publish(pollId, {
          pollOptionId: userPreviewVoteOnPoll.pollOptionId,
          votes: Number(votes)
        })
      } else if(userPreviewVoteOnPoll) {
        return rep.status(400).send({message: 'You already voted on this poll.'})
      }
    }

    if (!sessionId) {
      sessionId = randomUUID();

      rep.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true,
        httpOnly: true,
      });
    }
    
    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId
      }
    })

    const votes = await redis.zincrby(pollId, 1, pollOptionId)

    voting.publish(pollId, {
      pollOptionId,
      votes: Number(votes)
    })

    return rep.status(201).send()
  })
}