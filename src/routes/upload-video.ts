import { FastifyInstance } from "fastify";
import { fastifyMultipart } from '@fastify/multipart'
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pipeline } from 'node:stream'
import { promisify } from 'node:util'
import { createWriteStream } from 'node:fs'
import { prisma } from "../lib/prisma";

const pump = promisify(pipeline)

export const uploadVideoRoute = async (app: FastifyInstance) => {
    app.register(fastifyMultipart, {
        limits: {
            fileSize: 1_048_576 * 25 // 25Mb
        }
    })
    app.post('/videos', async (request, reply) => {
        const data = await request.file()
        if(!data) {
            return reply.status(400).send({ error: 'Missing file input.'})
        }
        const ext = path.extname(data.filename)
        if(ext !== '.mp3') {
            return reply.status(400).send({ error: 'Invalid input type, please upload a MP3.'})
        }
        const fileBaseName = path.basename(data.filename, ext)
        const fileUploadName = `${fileBaseName}-${randomUUID()}${ext}`
        const uploadDir = path.resolve(__dirname, '../../tmp', fileUploadName)
        await pump(data.file, createWriteStream(uploadDir))
        const video = await prisma.video.create({
            data: {
                name: data.filename,
                path: uploadDir
            }
        })
        return { video }
    })
}