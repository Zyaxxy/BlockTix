export const createTableGuard = (tableName: string) => {
  let tableMissing = false;

  const isMissingTableError = (errorMessage: string | undefined) => {
    if (!errorMessage) return false;

    const message = errorMessage.toLowerCase();
    const normalizedTableName = tableName.toLowerCase();

    return (
      message.includes(`public.${normalizedTableName}`) ||
      message.includes("could not find the table") ||
      (message.includes("relation") && message.includes(normalizedTableName) && message.includes("does not exist"))
    );
  };

  return {
    isMissingTableError,
    isTableMissing: () => tableMissing,
    markTableMissing: () => {
      tableMissing = true;
    },
  };
};