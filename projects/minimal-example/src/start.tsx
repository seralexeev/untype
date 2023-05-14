import 'source-map-support/register';

import { ContentResponse, ControllerInvoker, EndpointResponse, HttpContext, InvokeArgs, RpcApi } from '@untype/rpc';
import { createControllers } from '@untype/rpc-express';
import express from 'express';
import React, { ReactNode, isValidElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { container } from 'tsyringe';
import z from 'zod';

type User = { id: string };
type Context = { userAgent: string };

class HelloController extends ControllerInvoker<Context, User> {
    public ['GET /'] = this.rest({
        anonymous: true,
        resolve: ({ ctx }) => (
            <html lang='en'>
                <head>
                    <meta charSet='UTF-8' />
                    <meta name='viewport' content='width=device-width, initial-scale=1.0' />
                    <title>Hello from React</title>
                </head>
                <body>
                    Hello {ctx.auth?.id ?? 'world'} from {ctx.userAgent}!
                    <form>
                        <label htmlFor='name'>Email</label>
                        <input type='text' name='name' id='name' />
                        <button type='submit'>Submit</button>
                    </form>
                    <script src='/script' />
                </body>
            </html>
        ),
    });

    public ['GET /script'] = this.rest({
        anonymous: true,
        resolve: () => ContentResponse.javascript`
            document.querySelector('form').addEventListener('submit', () => {
                event.preventDefault();
                const data = new FormData(event.target);
            
                fetch('/user/sayHello', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: data.get('name'),
                    }),
                }).then((x) => x.text()).then((x) => alert(x));
            });
        `,
    });

    public ['user/sayHello'] = this.rpc({
        anonymous: true,
        input: z.object({
            name: z.string(),
        }),
        output: z.object({
            message: z.string(),
        }),
        resolve: ({ input }) => ({
            message: `Hello ${input.name}`,
        }),
    });

    public override auth = async (ctx: HttpContext) => {
        const userId = ctx.req.headers['x-user-id'];
        if (typeof userId === 'string') {
            return { id: userId };
        }

        return null;
    };

    public override invoke = async ({ resolve, req }: InvokeArgs<Context, User>) => {
        const ctx = {
            userAgent: req.headers['user-agent'] as string,
        };

        return resolve(ctx);
    };

    public override onRawOutput = async (output: unknown) => {
        return isValidElement(output) ? new StaticReact(output) : super.onRawOutput(output);
    };
}

class StaticReact extends EndpointResponse {
    public constructor(private children: ReactNode) {
        super();
    }

    public override write({ res }: HttpContext) {
        res.setHeader('Content-Type', 'text/html');
        const { pipe } = renderToPipeableStream(this.children);

        return new Promise<void>((resolve, reject) => {
            pipe(res).on('error', reject).on('close', resolve);
        });
    }
}

const controllers = { HelloController };
export type Api = RpcApi<typeof controllers>;

// type Api = {
//     "user/sayHello": {
//         output: {
//             message: string;
//         };
//         input: {
//             name: string;
//         };
//     };
// }

express()
    .use(express.json())
    .use('/', createControllers({ controllers: { HelloController }, container }))
    .listen(3000);
