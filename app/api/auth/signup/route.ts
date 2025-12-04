import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, displayName } = signupSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Create user with profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            displayName: displayName || email.split('@')[0],
          },
        },
        settings: {
          create: {
            theme: 'dark',
          },
        },
        notificationPrefs: {
          create: {},
        },
      },
      include: {
        profile: true,
      },
    })

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        displayName: user.profile?.displayName,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

