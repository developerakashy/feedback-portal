import { createItem, deleteItem, readItems, readMe, readRole, updateItem } from "@directus/sdk";
import { Badge, Button, Group, Text, Title, Table, Box, Stack, TextInput, Textarea, Select, Modal } from "@mantine/core";
import { ActionFunction, data, json, type LoaderFunction, type LoaderFunctionArgs, type MetaFunction } from "@remix-run/node";
import { Form, useActionData, useLoaderData, useNavigation } from "@remix-run/react";
import { useEffect, useState } from "react";
import { accessTokenStorage, refreshTokenStorage } from "~/sessions.server";
import { getDirectusClient } from "~/utils/directus.server";
export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

type Feedback = {
  id: string;
  title: string;
  description: string;
  status: 'Pending' | 'Reviewed';
  created_by?: {
    email?: string;
    first_name?: string;
  };
};

export const  loader: LoaderFunction = async ({request}) => {

  const { directus, accessTokenSession, refreshTokenSession, sessionUpdated } = await getDirectusClient(request)

  const user = await directus.request(readMe())
  const role = await directus.request(readRole(user.role))
  const feedbacks = await directus.request<Feedback[]>(readItems('feedback', {
    fields: ['id', 'title', 'description', 'status', 'created_by.email', 'created_by.first_name'],
    sort: ['-created_at'],
  }))
  console.log("user", user)
  const headers = new Headers();

  if(sessionUpdated){
    console.log("session commited")
    headers.append("Set-Cookie", await accessTokenStorage.commitSession(accessTokenSession))
    headers.append("Set-Cookie", await refreshTokenStorage.commitSession(refreshTokenSession))
  }

  return json({success: true, user, feedbacks, role}, { headers })
}

export default function Index() {
  const [opened, setOpened] = useState(false);
  const {user, feedbacks, role} = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === "submitting"
  const isAdmin = role?.name === 'Administrator'

  const closeModal = () => {
    if(actionData?.success){
      setOpened(false)
    }
  }

  useEffect(() => {
    closeModal()
  },[actionData])

  console.log(feedbacks[0])
  return (
    <div>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title="Create Feedback"
      >
        {!isAdmin ?
          (<Form method="post" className="space-y-4">
            <Stack spacing="md">
              <TextInput
                label="Title"
                name="title"
                required
                placeholder="Enter title"
              />

              <Textarea
                label="Description"
                name="description"
                required
                minRows={3}
                minLength={20}
                placeholder="Enter a detailed description"
              />

              <Select
                label="Category"
                name="category"
                required
                placeholder="Select category"
                data={[
                  { value: 'Bug', label: 'Bug' },
                  { value: 'Feature', label: 'Feature' },
                  { value: 'Other', label: 'Other' },
                ]}
              />

              <Button type="submit" variant="filled" color="blue">
                {isSubmitting ? 'Sending...' : 'Send feedback'}
              </Button>
            </Stack>
          </Form>) : null

        }
      </Modal>

      <Box mb="md">
        <Group position="apart" align="center">
          <Title order={2}>Feedback Portal</Title>

          <Group spacing="sm">
            {!isAdmin &&
              <Button onClick={() => setOpened(true)} variant="light" color="blue" size="xs">
                send feedback
              </Button>
            }
            <Text size="sm" fw={600} color="dimmed">{user.email}</Text>
            <Form method="post">
              <Button
                type="submit"
                variant="subtle"
                color="red"
                size="xs"
                name="intent"
                value="logout"
              >
                Logout
              </Button>
            </Form>
          </Group>
        </Group>
      </Box>

      {actionData?.error && (
        <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{actionData.error}</div>
      )}



      <Table captionSide="bottom" withBorder withColumnBorders>
        <caption>Feedback list</caption>
        <thead>
          <tr>
            <th>User</th>
            <th>Title</th>
            <th>Description</th>
            <th>Status</th>
            {isAdmin ? <th>Actions</th> : null}
          </tr>
        </thead>
        <tbody>
          {feedbacks.map((feedback) => {
            const isBeingSubmitted = navigation.formData?.get("id") === feedback.id;
            const isDeleting = navigation.formData?.get("intent") === "delete"
            console.log(isDeleting)

            return (
              <tr key={feedback.id}>
                <td>{feedback.created_by?.first_name || feedback.created_by?.email}</td>
                <td>{feedback.title}</td>
                <td>{feedback.description}</td>
                <td>
                  <Badge color={feedback.status === "Pending" ? "red" : "teal"}>
                    {feedback.status}
                  </Badge>
                </td>
                  {isAdmin && (
                  <td>
                    <Form method="post">
                      <input type="hidden" name="id" value={feedback.id} />
                      <Group gap="sm" mt="sm">
                        {feedback.status === "Pending" ? (
                          <Button
                            size="xs"
                            type="submit"
                            variant="outline"
                            color="teal"
                            name="intent"
                            value="Reviewed"
                            loading={isBeingSubmitted && !isDeleting}
                          >
                            {isBeingSubmitted && !isDeleting ? "Marking..." : "Mark Reviewed"}
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            type="submit"
                            variant="outline"
                            color="red"
                            name="intent"
                            value="Pending"
                            loading={isBeingSubmitted && !isDeleting}
                          >
                            {isBeingSubmitted && !isDeleting ? "Marking..." : "Mark Pending"}
                          </Button>
                        )}

                        <Button
                          size="xs"
                          type="submit"
                          variant="outline"
                          color="gray"
                          name="intent"
                          value="delete"
                          loading={isBeingSubmitted && isDeleting}
                        >
                          {isBeingSubmitted && isDeleting ? "Deleting" : 'Delete'}
                        </Button>
                      </Group>
                    </Form>
                </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </Table>

    </div>
  );
}

export const action:ActionFunction = async ({request}) => {
    const formData = await request.formData()

    const intent = formData.get('intent')
    const id = formData.get('id') as string

    const title = formData.get("title")
    const description = formData.get("description")
    const category = formData.get("category")

    const { directus, sessionUpdated, accessTokenSession, refreshTokenSession } = await getDirectusClient(request)

    const headers = new Headers();

    if(intent === 'logout'){
      headers.append("Set-Cookie", await accessTokenStorage.destroySession(accessTokenSession))
      headers.append("Set-Cookie", await refreshTokenStorage.destroySession(refreshTokenSession))

      return json({success: true, message: 'feedback deleted'}, {headers})
    }

    if(sessionUpdated){
      console.log("session commited")
      headers.append("Set-Cookie", await accessTokenStorage.commitSession(accessTokenSession))
      headers.append("Set-Cookie", await refreshTokenStorage.commitSession(refreshTokenSession))
    }

    try {

      if(intent === 'delete'){
        await directus.request(deleteItem('feedback', id))
        return json({success: true, message: 'feedback deleted'}, {headers})
      }

      if(intent === 'Pending' || intent === 'Reviewed'){
        const status = intent
        const updated = await directus.request(updateItem('feedback', id, {
          status
        }))

        return json({success: true, data: updated, message: 'Item status updated'}, {headers})
      }

      const itemCreated = await directus.request(createItem("feedback", {
        title,
        description,
        category
      }))

      console.log(itemCreated)
      return json({success: true, data: itemCreated, message: 'Feedback created successfully'}, {headers})
    } catch (error) {
      console.log(error)
      const typedError = error as { errors: { message: string }[] };

      const errorMessage = typedError?.errors?.[0].message || 'something went wrong during register'
      return json({success: false, data: error, message:errorMessage}, {headers})
    }

}
