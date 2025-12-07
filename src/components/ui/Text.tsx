import React from "react";
import { Text as RNText, TextProps } from "react-native";

export const Text: React.FC<TextProps> = ({ style, children, ...rest }) => {
  return (
    <RNText
      {...rest}
      style={[
        { color: "#fff", fontFamily: "System" },
        Array.isArray(style) ? style : [style]
      ]}
    >
      {children}
    </RNText>
  );
};
