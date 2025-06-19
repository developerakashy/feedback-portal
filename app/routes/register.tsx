import { Anchor, Box, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core"
import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node"
import { Form, json, Link, useActionData, useNavigation } from "@remix-run/react"
import { accessTokenStorage, refreshTokenStorage } from "~/sessions.server"
import { RegisterUser } from "~/utils/directus.server"

export const loader:LoaderFunction = async ({request}) => {
    const cookie = request.headers.get('Cookie')

    const session = await accessTokenStorage.getSession(cookie)
    const token = session.get("access_token")
    if(token) return redirect('/')

    return json({})
}

export default function Register(){
    const actionData = useActionData<typeof action>()
    const navigation = useNavigation()
    const isSubmitting = navigation.state === 'submitting'

    return (
        <Box maw={400} mx="auto" mt="xl">
            <Paper shadow="md" p="xl" radius="md" withBorder>
                <Title order={3} mb="md" align="center">
                Register
                </Title>

                <Form method="post">
                <Stack spacing="md">
                    <TextInput
                    name="first_name"
                    label="First Name"
                    placeholder="Enter your first name"
                    required
                    />

                    <TextInput
                    name="last_name"
                    label="Last Name"
                    placeholder="Enter your last name"
                    required
                    />

                    <TextInput
                    name="email"
                    type="email"
                    label="Email"
                    placeholder="Enter your email"
                    required
                    />

                    <PasswordInput
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    required
                    />

                    <Button
                    type="submit"
                    color="blue"
                    fullWidth
                    loading={isSubmitting}
                    >
                    {isSubmitting ? 'Registering...' : 'Register'}
                    </Button>
                </Stack>

                <Text size="sm" align="center" mt="md">
                    Already have an account?{' '}
                    <Anchor component={Link} to="/login" size="sm" color="blue">
                        Login
                    </Anchor>
                </Text>
                </Form>

                {actionData && !actionData.success && (
                <Text color="red" size="sm" mt="md" align="center">
                    {actionData.message}
                </Text>
                )}


            </Paper>
        </Box>
    )
}

export const action:ActionFunction = async ({request}) => {
    const formData = await request.formData()

    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const first_name = formData.get("first_name") as string
    const last_name = formData.get("last_name") as string

    const {success, data, message} = await RegisterUser(first_name, last_name, email, password)

    if(success){
        const session = await accessTokenStorage.getSession(request.headers.get('Cookie'))
        const refreshSession = await refreshTokenStorage.getSession(request.headers.get('Cookie'))

        session.set('access_token', data.access_token)
        refreshSession.set("refresh_token", data.refresh_token)

        const headers = new Headers()

        headers.append("Set-Cookie", await accessTokenStorage.commitSession(session))
        headers.append("Set-Cookie", await refreshTokenStorage.commitSession(refreshSession))

        return redirect('/', {
            headers
        })
    }

    return json({success, data, message}, {status: 401})
}
