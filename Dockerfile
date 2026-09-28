FROM node:24.17.0-alpine AS base

WORKDIR /home/node/app
RUN apk add --no-cache bash
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder

ENV NEXT_TELEMETRY_DISABLED=1
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
RUN if [ -z "${NEXT_PUBLIC_SUPABASE_URL}" ] || [ -z "${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}" ]; then \
      printf '%s\n' 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are required for the builder stage.' >&2; \
      exit 1; \
    fi
ENV NEXT_PUBLIC_SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}" \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY}"
COPY . ./
RUN npm run build

FROM base AS production-dependencies

RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund

FROM node:24.17.0-alpine AS production

WORKDIR /home/node/app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
RUN chown node:node /home/node/app
COPY --from=production-dependencies --chown=node:node /home/node/app/node_modules ./node_modules
COPY --from=builder --chown=node:node /home/node/app/build ./build
COPY --from=builder --chown=node:node /home/node/app/public ./public
COPY --from=builder --chown=node:node /home/node/app/package.json ./package.json
COPY --from=builder --chown=node:node /home/node/app/next.config.js ./next.config.js
USER node
EXPOSE 3000
CMD ["./node_modules/.bin/next", "start", "-H", "0.0.0.0"]
