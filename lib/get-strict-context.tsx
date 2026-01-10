import * as React from 'react';

function getStrictContext<T>(
  name?: string,
): readonly [
  ({
    value,
    children,
  }: {
    value: T;
    children?: React.ReactNode;
  }) => React.JSX.Element,
  () => T,
] {
  const Context = React.createContext<T | undefined>(undefined);

  const Provider = ({
    value,
    children,
  }: {
    value: T;
    children?: React.ReactNode;
  }) => <Context.Provider value={value}>{children}</Context.Provider>;

  const useRequiredContext = () => {
    const contextValue = React.useContext(Context);
    if (contextValue === undefined) {
      throw new Error(`useContext must be used within ${name ?? 'a Provider'}`);
    }
    return contextValue;
  };

  return [Provider, useRequiredContext] as const;
}

export { getStrictContext };
