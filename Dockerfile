# Use the official Bun image
# See all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base

# Set the working directory
WORKDIR /usr/src/app

# Stage 1: Install dependencies (dev and prod)
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lockb /temp/dev/
RUN cd /temp/dev && bun install

# Stage 2: Install production dependencies only
RUN mkdir -p /temp/prod
COPY package.json bun.lockb /temp/prod/
RUN cd /temp/prod && bun install --production

# Stage 3: Copy all project files and install dependencies for dev
FROM base AS development
COPY --from=install /temp/dev/node_modules ./node_modules
COPY . .

# Set environment variable for development
ENV NODE_ENV=development

# Expose the port for the development server
EXPOSE 3773

# Command to run the development server
CMD ["bun", "run", "dev"]

# Stage 4: Production-ready image
FROM base AS release
COPY --from=install /temp/prod/node_modules ./node_modules
COPY . .

# Set environment variable for production
ENV NODE_ENV=production

# Expose the port for production
EXPOSE 3773

# Command to run the production server
CMD ["bun", "run", "dev"]
