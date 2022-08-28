import * as Device from 'expo-device';
import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, SafeAreaView, Platform, BackHandler } from 'react-native';
import { WebView } from 'react-native-webview';
import * as SecureStore from 'expo-secure-store';
import { v4 as uuid_v4 } from 'uuid';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
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
    registerForPushNotificationsAsync().then(async (token) => {
      setExpoPushToken(token);

      // Send the token to server
      const deviceId = await getDeviceId();
      const userDevice = {
        deviceId: deviceId,
        platform: Platform.OS,
        manufacturer: Device.manufacturer,
        model: Device.deviceName,
        appVersion: '1.0.0',
        notificationToken: token
      };

      webViewRef.current.injectJavaScript(
        `
        setTimeout(function() { 
          window.sendUserDevice('` +
          JSON.stringify(userDevice) +
          `');
         }, 10);
        true; // note: this is required, or you'll sometimes get silent failures
      `
      );
    });

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

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: 'http://192.168.1.3:3003' }}
        ref={webViewRef}
        onMessage={(event) => {}}
        startInLoadingState={true}
        javaScriptEnabled={true}
        javaScriptEnabledAndroid={true}
        originWhitelist={['*']}
      />
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

const getDeviceId = async () => {
  if (Platform.OS === 'android') {
    return Application.androidId;
  } else {
    let deviceId = await SecureStore.getItemAsync('deviceId');

    if (!deviceId) {
      deviceId = Constants.deviceId ?? uuid_v4();
      await SecureStore.setItemAsync('deviceId', deviceId);
    }

    return deviceId;
  }
};
