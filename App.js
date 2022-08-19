import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, SafeAreaView, Platform, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  // const [lastNotificationObject, setLastNotificationObject] = useState();

  const webViewRef = useRef();

  const handleBackButtonPress = () => {
    try {
      webViewRef.current?.goBack();
    } catch (err) {
      console.log('[handleBackButtonPress] Error : ', err.message);
    }
  };

  useEffect(() => {
    if (
      lastNotificationResponse &&
      lastNotificationResponse.notification.request.content.data.url &&
      lastNotificationResponse.actionIdentifier ===
        Notifications.DEFAULT_ACTION_IDENTIFIER
    ) {
      Linking.openURL(
        lastNotificationResponse.notification.request.content.data.url
      );
    }
  }, [lastNotificationResponse]);

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) =>
      setExpoPushToken(token)
    );

    BackHandler.addEventListener('hardwareBackPress', handleBackButtonPress);

    // This listener is fired whenever a notification is received while the app is foregrounded
    notificationListener.current =
      Notifications.addNotificationReceivedListener((notification) => {
        console.log('addNotificationReceivedListener');
        // console.log(notification);
      });

    // This listener is fired whenever a user taps on or interacts with a notification (works when app is foregrounded, backgrounded, or killed)
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log('addNotificationResponseReceivedListener2');
        console.log(response);
        let redirectTo =
          response.notification.request.content.data.redirectTo ?? undefined;
        if (redirectTo) {
          webViewRef.current.injectJavaScript(`
            window.location.href = '${redirectTo}';
            true;
          `);
        }
      });

    return () => {
      Notifications.removeNotificationSubscription(
        notificationListener.current
      );
      Notifications.removeNotificationSubscription(responseListener.current);
      BackHandler.removeEventListener(
        'hardwareBackPress',
        handleBackButtonPress
      );
    };
  }, []);

  // <Text>Your expo push token: {expoPushToken}</Text>
  return (
    <SafeAreaView style={styles.container}>
      <WebView source={{ uri: 'http://192.168.1.3:3003' }} ref={webViewRef} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: 30
  }
});

async function registerForPushNotificationsAsync() {
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log(token);
  } else {
    alert('Must use physical device for Push Notifications');
  }

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C'
    });
  }

  return token;
}
