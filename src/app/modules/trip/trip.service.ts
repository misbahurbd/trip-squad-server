import { JwtPayload } from "jsonwebtoken"
import { ITrip } from "./trip.interface"
import prisma from "../../../utils/prisma-client"
import {
  IOptions,
  parseFilterOptions,
  parseOptions,
} from "../../../helpers/query-helpers"
import { Prisma } from "@prisma/client"
import { tripSearchFields } from "./trip.constant"
import uploadOnCloudinary from "../../../utils/cloudinary"
import { AppError } from "../../errors/app-error"
import httpStatus from "http-status"

const createTrip = async (
  user: JwtPayload,
  files: Express.Multer.File[],
  tripData: ITrip
) => {
  const uploadImages = files.map(async file => {
    const result = await uploadOnCloudinary(file.path)
    return result
  })

  const images = await Promise.all(uploadImages)
  if (images.length == 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Unable to upload images")
  }
  const imgArray = images.map(img => {
    if (!img || !img.secure_url) return null
    return img.secure_url
  })

  const trip = await prisma.trip.create({
    data: {
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      tripType: tripData.tripType,
      description: tripData.description,
      budget: Number(tripData.budget),
      photos: imgArray as string[],
      creatorId: user.id,
    },
  })

  return trip
}

const getTrips = async (query: any, options: IOptions) => {
  const { page, limit, skip, sortBy, sortOrder } = parseOptions(options)
  const filterCondition: Prisma.TripWhereInput[] = parseFilterOptions(
    query,
    tripSearchFields
  )

  const trips = await prisma.trip.findMany({
    where: {
      AND: filterCondition,
      isDeleted: false,
    },
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
  })

  const total = await prisma.trip.count({
    where: {
      AND: filterCondition,
      isDeleted: false,
    },
  })

  return {
    data: trips,
    meta: {
      page,
      limit,
      total,
    },
  }
}

const getTripsByUserId = async (
  userId: string,
  query: any,
  options: IOptions
) => {
  const { page, limit, skip, sortBy, sortOrder } = parseOptions(options)
  const filterCondition: Prisma.TripWhereInput[] = parseFilterOptions(
    query,
    tripSearchFields
  )

  const trips = await prisma.trip.findMany({
    where: {
      AND: filterCondition,
      isDeleted: false,
      creatorId: userId,
    },
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
  })

  const total = await prisma.trip.count({
    where: {
      AND: filterCondition,
      isDeleted: false,
      creatorId: userId,
    },
  })

  return {
    data: trips,
    meta: {
      page,
      limit,
      total,
    },
  }
}

const getTripById = async (id: string) => {
  const trip = await prisma.trip.findUnique({
    where: {
      id,
      isDeleted: false,
    },
  })

  return trip
}

export const tripService = {
  createTrip,
  getTrips,
  getTripById,
}