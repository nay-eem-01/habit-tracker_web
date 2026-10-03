import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteResource, pinResource } from '../api/resources'

/** Pin and delete, for any list of resources: both refresh the library and every goal's list. */
export function useResourceActions() {
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['resources'] }),
      queryClient.invalidateQueries({ queryKey: ['goal-resources'] }),
    ])
  const pin = useMutation({
    mutationFn: ({ id, pinned }: { id: number; pinned: boolean }) => pinResource(id, pinned),
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: deleteResource, onSuccess: refresh })
  return {
    pin,
    remove,
    busy: pin.isPending || remove.isPending,
    error: pin.error ?? remove.error,
  }
}
