import { Platform } from 'react-native';
import { useColor } from '@/hooks/useColor';
import MaterialIcons from '@expo/vector-icons/Feather';
// `Icon`, `Label`, `Badge` and `VectorIcon` are statics on `NativeTabs.Trigger`
// rather than top-level exports of this module — they were removed as named
// exports in expo-router 57 and importing them by name throws at runtime.
import { NativeTabs } from 'expo-router/unstable-native-tabs';

const { Icon, Label, VectorIcon } = NativeTabs.Trigger;

export default function TabsLayout() {
  const primary = useColor('primary');
  const foreground = useColor('foreground');

  return (
    <NativeTabs
      minimizeBehavior='onScrollDown'
      labelStyle={{
        default: { color: primary },
        selected: { color: foreground },
      }}
      iconColor={{
        default: primary,
        selected: foreground,
      }}
      labelVisibilityMode='labeled'
      disableTransparentOnScrollEdge={true}
    >
      <NativeTabs.Trigger name='(home)'>
        {Platform.select({
          ios: <Icon sf='house.fill' />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name='home' />} />
          ),
        })}
        <Label>Home</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name='grades'>
        {Platform.select({
          ios: <Icon sf='graduationcap.fill' />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name='award' />} />
          ),
        })}
        <Label>Grades</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name='shop'>
        {Platform.select({
          ios: <Icon sf='bag.fill' />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name='shopping-bag' />} />
          ),
        })}
        <Label>Shop</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name='progress'>
        {Platform.select({
          ios: <Icon sf='chart.bar.fill' />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name='trending-up' />} />
          ),
        })}
        <Label>Progress</Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name='profile'>
        {Platform.select({
          ios: <Icon sf='person.crop.circle.fill' />,
          android: (
            <Icon src={<VectorIcon family={MaterialIcons} name='user' />} />
          ),
        })}
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
