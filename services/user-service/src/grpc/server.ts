import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { fileURLToPath } from 'url';
import path from 'path';
import { userService } from '@/services/user.service';
import { logger } from '@/utils/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Works for both: dev (src/grpc/) and prod (dist/grpc/)
const PROTO_PATH = path.resolve(__dirname, '../../../../proto/user.proto');

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDef) as unknown as {
  user: {
    UserService: grpc.ServiceClientConstructor;
  };
};

const UserServiceDef = grpcObject.user.UserService;

// ---- RPC handlers ----

const getUser: grpc.handleUnaryCall<{ id: string }, object> = async (call, callback) => {
  try {
    const user = await userService.getUserById(call.request.id);
    callback(null, {
      id: user.id,
      email: user.email,
      display_name: user.displayName,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const code = error.statusCode === 404 ? grpc.status.NOT_FOUND : grpc.status.INTERNAL;
    callback({ code, message: error.message });
  }
};

const getUsersByIds: grpc.handleUnaryCall<{ ids: string[] }, object> = async (call, callback) => {
  try {
    const ids: string[] = call.request.ids ?? [];
    const users = await Promise.all(ids.map((id) => userService.getUserById(id)));
    callback(null, {
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        display_name: u.displayName,
        created_at: u.createdAt.toISOString(),
        updated_at: u.updatedAt.toISOString(),
      })),
    });
  } catch (err: unknown) {
    const error = err as Error & { statusCode?: number };
    const code = error.statusCode === 404 ? grpc.status.NOT_FOUND : grpc.status.INTERNAL;
    callback({ code, message: error.message });
  }
};

// ---- Server lifecycle ----

let server: grpc.Server | null = null;

export const startGrpcServer = (port: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    server = new grpc.Server();

    server.addService((UserServiceDef as unknown as { service: grpc.ServiceDefinition }).service, {
      GetUser: getUser,
      GetUsersByIds: getUsersByIds,
    });

    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) {
          reject(err);
          return;
        }
        logger.info({ port: boundPort }, 'gRPC server running');
        resolve();
      },
    );
  });
};

export const stopGrpcServer = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!server) {
      resolve();
      return;
    }
    server.tryShutdown((err) => {
      if (err) {
        logger.error({ err }, 'gRPC shutdown error');
        server?.forceShutdown();
      }
      resolve();
    });
  });
};
