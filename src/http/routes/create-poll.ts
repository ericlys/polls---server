import z from "zod"
import { prisma } from "../../lib/prisma"
import { FastifyInstance } from "fastify"

export async function createPoll(app: FastifyInstance) {
  app.post('/polls', async (req, rep) => {
    const createPollBody = z.object({
      title: z.string(),
      options: z.array(z.string())
    })
    
    const {title, options} = createPollBody.parse(req.body)

    const poll = await prisma.poll.create({
      data: {
        title,
        options: {
          createMany: {
            data: options.map((option) => ({
              title: option
            }))
          }
        }
      }
    })

    return rep.status(201).send({pollId: poll.id})
  })
}